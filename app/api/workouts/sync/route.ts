import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Zod schemas for validation
const ExerciseCategoryEnum = z.enum(["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT", "CARDIO"]);
const SetTypeEnum = z.enum(["WARMUP", "NORMAL", "DROPSET", "FAILURE"]);
const SessionStatusEnum = z.enum(["IN_PROGRESS", "COMPLETED"]);

const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ExerciseCategoryEnum.default("BARBELL"),
  primaryMuscle: z.string().min(1),
  secondaryMuscles: z.array(z.string()).default([]),
  isCustom: z.boolean().default(false),
  userId: z.string().nullable().optional(),
});

const WorkoutSessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullable().optional(),
  routineId: z.string().nullable().optional(),
  title: z.string().min(1),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  durationSec: z.number().int().nonnegative().default(0),
  totalVolume: z.number().nonnegative().default(0),
  status: SessionStatusEnum.default("IN_PROGRESS"),
});

const SetLogSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  exerciseId: z.string().min(1),
  setNumber: z.number().int().positive(),
  weight: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  setType: SetTypeEnum.default("NORMAL"),
  isCompleted: z.boolean().default(false),
  isPR: z.boolean().default(false),
});

const RoutineItemSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1),
  orderIndex: z.number().int().default(1),
  targetSets: z.number().int().default(3),
  restSeconds: z.number().int().default(90),
});

const RoutineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  userId: z.string().nullable().optional(),
  items: z.array(RoutineItemSchema).optional().default([]),
});

const BodyWeightSchema = z.object({
  id: z.string().min(1),
  weight: z.number().positive(),
  unit: z.string().default("kg"),
  date: z.string().min(1),
  note: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

const MutationItemSchema = z.object({
  id: z.string(), // outbox queue id
  entityType: z.enum([
    "workoutSession",
    "setLog",
    "routine",
    "routineItem",
    "exercise",
    "bodyWeight",
    "bodyWeightLog",
  ]),
  entityId: z.string(),
  action: z.enum(["UPSERT", "DELETE"]),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.number(),
  retryCount: z.number().optional().default(0),
});

const SyncBatchRequestSchema = z.object({
  mutations: z.array(MutationItemSchema),
});

/**
 * Resolves the true PostgreSQL User UUID, handling Google providerAccountId sub or email mismatch
 */
async function resolveDbUserId(sessionUserId?: string | null, sessionEmail?: string | null): Promise<string | null> {
  if (sessionUserId) {
    const userById = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } }).catch(() => null);
    if (userById) return userById.id;

    // Check Account table in case sessionUserId is providerAccountId (Google sub)
    const account = await prisma.account.findFirst({
      where: { providerAccountId: sessionUserId },
      select: { userId: true },
    }).catch(() => null);
    if (account) return account.userId;
  }

  if (sessionEmail) {
    const userByEmail = await prisma.user.findUnique({ where: { email: sessionEmail }, select: { id: true } }).catch(() => null);
    if (userByEmail) return userByEmail.id;
  }

  return null;
}

/**
 * GET: Fetch all user records from Postgres for bi-directional sync (Mobile <-> PC)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = await resolveDbUserId(session?.user?.id, session?.user?.email);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to sync." },
        { status: 401 }
      );
    }

    // Verify DB connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      return NextResponse.json(
        { success: false, error: "Database offline" },
        { status: 503 }
      );
    }

    const [workoutSessions, routines, customExercises, bodyWeights] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId },
        include: {
          sets: {
            orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          },
        },
        orderBy: { startTime: "desc" },
      }),
      prisma.routine.findMany({
        where: { userId },
        include: {
          items: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.exercise.findMany({
        where: { userId },
      }),
      prisma.bodyWeightLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
    ]);

    // Server-side deduplication of duplicate sessions (e.g. legacy sync glitch or repeat inserts)
    const cleanSessions: typeof workoutSessions = [];
    const deleteSessionIds: string[] = [];
    const skippedSessionIds = new Set<string>();

    for (let i = 0; i < workoutSessions.length; i++) {
      const s1 = workoutSessions[i];
      if (skippedSessionIds.has(s1.id)) continue;

      const t1 = new Date(s1.startTime).getTime();
      const norm1 = (s1.title || "").trim().toLowerCase();

      for (let j = i + 1; j < workoutSessions.length; j++) {
        const s2 = workoutSessions[j];
        if (skippedSessionIds.has(s2.id)) continue;

        const t2 = new Date(s2.startTime).getTime();
        const norm2 = (s2.title || "").trim().toLowerCase();

        if (norm1 === norm2 && Math.abs(t1 - t2) <= 15 * 60 * 1000) {
          const setsCount1 = s1.sets?.length || 0;
          const setsCount2 = s2.sets?.length || 0;

          const loserId = setsCount2 > setsCount1 || (setsCount2 === setsCount1 && s2.totalVolume > s1.totalVolume) ? s1.id : s2.id;
          skippedSessionIds.add(loserId);
          deleteSessionIds.push(loserId);
        }
      }

      if (!skippedSessionIds.has(s1.id)) {
        cleanSessions.push(s1);
      }
    }

    if (deleteSessionIds.length > 0) {
      // Async clean up of duplicate sessions in PostgreSQL
      void (async () => {
        try {
          await prisma.setLog.deleteMany({ where: { sessionId: { in: deleteSessionIds } } });
          await prisma.workoutSession.deleteMany({ where: { id: { in: deleteSessionIds } } });
        } catch (cleanErr) {
          console.warn("[Sync GET] Failed to purge server duplicates:", cleanErr);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      sessions: cleanSessions,
      routines,
      customExercises,
      bodyWeights,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Sync GET Route] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Process mutations queue from client outbox (UPSERT / DELETE)
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "sync-post", { limit: 120, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many sync requests. Please retry in a moment." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetTime / 1000).toString(),
        },
      }
    );
  }

  try {
    const session = await auth();
    const authenticatedUserId = await resolveDbUserId(session?.user?.id, session?.user?.email);

    const rawBody = await req.json();
    const parseResult = SyncBatchRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid sync batch payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { mutations } = parseResult.data;
    const syncedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Verify if database connection is available
    let hasDbConnection = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      hasDbConnection = false;
      console.warn("[Sync Route] Database is offline. Acknowledging mutations.");
    }

    // Process mutations idempotently
    for (const mutation of mutations) {
      try {
        if (!hasDbConnection) {
          syncedIds.push(mutation.id);
          continue;
        }

        const { entityType, entityId, action, payload } = mutation;

        // 1. DELETE ACTIONS
        if (action === "DELETE") {
          if (entityType === "workoutSession") {
            await prisma.setLog.deleteMany({ where: { sessionId: entityId } }).catch(() => null);
            await prisma.workoutSession.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "setLog") {
            await prisma.setLog.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "routine") {
            await prisma.routineItem.deleteMany({ where: { routineId: entityId } }).catch(() => null);
            await prisma.routine.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "exercise") {
            await prisma.exercise.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "bodyWeight" || entityType === "bodyWeightLog") {
            await prisma.bodyWeightLog.delete({ where: { id: entityId } }).catch(() => null);
          }
          syncedIds.push(mutation.id);
          continue;
        }

        // 2. UPSERT ACTIONS
        if (entityType === "workoutSession") {
          const parsed = WorkoutSessionSchema.safeParse(payload);
          if (!parsed.success) {
            errors.push({ id: mutation.id, error: parsed.error.message });
            continue;
          }
          const data = parsed.data;
          let validRoutineId: string | null = null;
          if (data.routineId) {
            const routine = await prisma.routine.findUnique({ where: { id: data.routineId } }).catch(() => null);
            if (routine) validRoutineId = data.routineId;
          }

          const targetUserId = authenticatedUserId;

          await prisma.workoutSession.upsert({
            where: { id: data.id },
            update: {
              title: data.title,
              startTime: new Date(data.startTime),
              endTime: data.endTime ? new Date(data.endTime) : null,
              durationSec: data.durationSec,
              totalVolume: data.totalVolume,
              status: data.status,
              userId: targetUserId,
              routineId: validRoutineId,
            },
            create: {
              id: data.id,
              title: data.title,
              startTime: new Date(data.startTime),
              endTime: data.endTime ? new Date(data.endTime) : null,
              durationSec: data.durationSec,
              totalVolume: data.totalVolume,
              status: data.status,
              userId: targetUserId,
              routineId: validRoutineId,
            },
          });
          syncedIds.push(mutation.id);
        } else if (entityType === "setLog") {
          const parsed = SetLogSchema.safeParse(payload);
          if (!parsed.success) {
            errors.push({ id: mutation.id, error: parsed.error.message });
            continue;
          }
          const data = parsed.data;

          // Ensure session shell exists if out-of-order sync occurs
          const session = await prisma.workoutSession.findUnique({ where: { id: data.sessionId } }).catch(() => null);
          if (!session) {
            await prisma.workoutSession.create({
              data: {
                id: data.sessionId,
                title: "Workout Session",
                startTime: new Date(),
                durationSec: 0,
                totalVolume: 0,
                status: "IN_PROGRESS",
                userId: authenticatedUserId ?? null,
              },
            }).catch(() => null);
          }

          // Ensure exercise shell exists if custom exercise arrived after set
          const exercise = await prisma.exercise.findUnique({ where: { id: data.exerciseId } }).catch(() => null);
          if (!exercise) {
            await prisma.exercise.create({
              data: {
                id: data.exerciseId,
                name: "Movement",
                primaryMuscle: "Full Body",
                category: "BARBELL",
                isCustom: true,
                userId: authenticatedUserId ?? null,
              },
            }).catch(() => null);
          }

          await prisma.setLog.upsert({
            where: { id: data.id },
            update: {
              setNumber: data.setNumber,
              weight: data.weight,
              reps: data.reps,
              rpe: data.rpe ?? null,
              setType: data.setType,
              isCompleted: data.isCompleted,
              isPR: data.isPR,
            },
            create: {
              id: data.id,
              sessionId: data.sessionId,
              exerciseId: data.exerciseId,
              setNumber: data.setNumber,
              weight: data.weight,
              reps: data.reps,
              rpe: data.rpe ?? null,
              setType: data.setType,
              isCompleted: data.isCompleted,
              isPR: data.isPR,
            },
          });
          syncedIds.push(mutation.id);
        } else if (entityType === "routine") {
          const parsed = RoutineSchema.safeParse(payload);
          if (!parsed.success) {
            errors.push({ id: mutation.id, error: parsed.error.message });
            continue;
          }
          const data = parsed.data;
          const targetUserId = authenticatedUserId;

          await prisma.routine.upsert({
            where: { id: data.id },
            update: {
              name: data.name,
              userId: targetUserId,
              updatedAt: new Date(),
            },
            create: {
              id: data.id,
              name: data.name,
              userId: targetUserId,
            },
          });

          // Sync routine items if included
          if (Array.isArray(data.items) && data.items.length > 0) {
            await prisma.routineItem.deleteMany({ where: { routineId: data.id } }).catch(() => null);

            // Deduplicate items by exerciseId
            const seenEx = new Set<string>();
            const uniqueItems = data.items.filter((it) => {
              if (seenEx.has(it.exerciseId)) return false;
              seenEx.add(it.exerciseId);
              return true;
            });

            for (let idx = 0; idx < uniqueItems.length; idx++) {
              const it = uniqueItems[idx];
              // Ensure exercise exists
              const ex = await prisma.exercise.findUnique({ where: { id: it.exerciseId } }).catch(() => null);
              if (!ex) {
                await prisma.exercise.create({
                  data: {
                    id: it.exerciseId,
                    name: "Exercise Movement",
                    primaryMuscle: "General",
                    category: "BARBELL",
                  },
                }).catch(() => null);
              }

              const itemId = it.id || `ri-${data.id}-${idx}-${Date.now()}`;
              await prisma.routineItem.create({
                data: {
                  id: itemId,
                  routineId: data.id,
                  exerciseId: it.exerciseId,
                  orderIndex: idx + 1,
                  targetSets: it.targetSets || 3,
                  restSeconds: it.restSeconds || 90,
                },
              }).catch(() => null);
            }
          }

          syncedIds.push(mutation.id);
        } else if (entityType === "exercise") {
          const parsed = ExerciseSchema.safeParse(payload);
          if (!parsed.success) {
            errors.push({ id: mutation.id, error: parsed.error.message });
            continue;
          }
          const data = parsed.data;
          await prisma.exercise.upsert({
            where: { id: data.id },
            update: {
              name: data.name,
              category: data.category,
              primaryMuscle: data.primaryMuscle,
              secondaryMuscles: data.secondaryMuscles,
              isCustom: data.isCustom,
              userId: authenticatedUserId,
            },
            create: {
              id: data.id,
              name: data.name,
              category: data.category,
              primaryMuscle: data.primaryMuscle,
              secondaryMuscles: data.secondaryMuscles,
              isCustom: data.isCustom,
              userId: authenticatedUserId,
            },
          });
          syncedIds.push(mutation.id);
        } else if (entityType === "bodyWeight" || entityType === "bodyWeightLog") {
          const parsed = BodyWeightSchema.safeParse(payload);
          if (!parsed.success) {
            errors.push({ id: mutation.id, error: parsed.error.message });
            continue;
          }
          const data = parsed.data;
          const targetUserId = authenticatedUserId;

          await prisma.bodyWeightLog.upsert({
            where: { id: data.id },
            update: {
              weight: data.weight,
              unit: data.unit,
              date: data.date,
              note: data.note ?? null,
              userId: targetUserId,
              updatedAt: new Date(),
            },
            create: {
              id: data.id,
              weight: data.weight,
              unit: data.unit,
              date: data.date,
              note: data.note ?? null,
              userId: targetUserId,
            },
          });
          syncedIds.push(mutation.id);
        }
      } catch (mutationErr: unknown) {
        console.error(`[Sync Route] Failed to process mutation ${mutation.id}:`, mutationErr);
        errors.push({
          id: mutation.id,
          error: mutationErr instanceof Error ? mutationErr.message : "Internal error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
      processedCount: syncedIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Sync Route] Fatal error in sync handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
