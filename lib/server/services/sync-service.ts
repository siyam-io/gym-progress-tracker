import { prisma } from "@/lib/prisma";
import {
  MutationItem,
  WorkoutSessionSchema,
  SetLogSchema,
  RoutineSchema,
  ExerciseSchema,
  BodyWeightSchema,
} from "@/lib/validations/sync-schema";

export const SYSTEM_ROUTINE_IDS = new Set([
  "routine-day-1",
  "routine-day-2",
  "routine-day-3",
]);

/**
 * Resolves the true PostgreSQL User UUID, handling Google providerAccountId sub or email mismatch
 */
export async function resolveDbUserId(
  sessionUserId?: string | null,
  sessionEmail?: string | null
): Promise<string | null> {
  if (sessionUserId) {
    const userById = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true },
    }).catch(() => null);
    if (userById) return userById.id;

    // Check Account table in case sessionUserId is providerAccountId (Google sub)
    const account = await prisma.account.findFirst({
      where: { providerAccountId: sessionUserId },
      select: { userId: true },
    }).catch(() => null);
    if (account) return account.userId;
  }

  if (sessionEmail) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    }).catch(() => null);
    if (userByEmail) return userByEmail.id;
  }

  return null;
}

/**
 * Fetch all cloud records for user with server-side deduplication
 */
export async function fetchUserSyncData(userId: string) {
  const [workoutSessions, routines, customExercises, bodyWeights] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId },
      include: {
        sets: {
          orderBy: [{ createdAt: "asc" }, { setNumber: "asc" }],
        },
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.routine.findMany({
      where: {
        OR: [
          { userId },
          { userId: null },
          { id: { in: Array.from(SYSTEM_ROUTINE_IDS) } },
        ],
      },
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

  // Server-side deduplication of duplicate sessions
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

        const loserId =
          setsCount2 > setsCount1 || (setsCount2 === setsCount1 && s2.totalVolume > s1.totalVolume)
            ? s1.id
            : s2.id;
        skippedSessionIds.add(loserId);
        deleteSessionIds.push(loserId);
      }
    }

    if (!skippedSessionIds.has(s1.id)) {
      cleanSessions.push(s1);
    }
  }

  if (deleteSessionIds.length > 0) {
    void (async () => {
      try {
        await prisma.setLog.deleteMany({ where: { sessionId: { in: deleteSessionIds } } });
        await prisma.workoutSession.deleteMany({ where: { id: { in: deleteSessionIds } } });
      } catch (cleanErr) {
        console.warn("[Sync Service] Failed to purge server duplicates:", cleanErr);
      }
    })();
  }

  return {
    sessions: cleanSessions,
    routines,
    customExercises,
    bodyWeights,
  };
}

/**
 * Process array of sync mutations against PostgreSQL
 */
export async function processServerMutations(
  mutations: MutationItem[],
  authenticatedUserId: string | null
): Promise<{
  syncedIds: string[];
  errors: Array<{ id: string; error: string }>;
}> {
  const syncedIds: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const mutation of mutations) {
    try {
      const { entityType, entityId, action, payload } = mutation;

      // 1. DELETE ACTIONS
      if (action === "DELETE") {
        if (entityType === "workoutSession") {
          await prisma.setLog.deleteMany({ where: { sessionId: entityId } }).catch(() => null);
          await prisma.workoutSession.delete({ where: { id: entityId } }).catch(() => null);
        } else if (entityType === "setLog") {
          await prisma.setLog.delete({ where: { id: entityId } }).catch(() => null);
        } else if (entityType === "routine") {
          // Guard: Never allow deleting system default routines
          if (SYSTEM_ROUTINE_IDS.has(entityId)) {
            syncedIds.push(mutation.id);
            continue;
          }
          await prisma.routineItem.deleteMany({ where: { routineId: entityId } }).catch(() => null);
          await prisma.routine.deleteMany({
            where: {
              id: entityId,
              ...(authenticatedUserId ? { userId: authenticatedUserId } : {}),
            },
          }).catch(() => null);
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

        await prisma.workoutSession.upsert({
          where: { id: data.id },
          update: {
            title: data.title,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
            durationSec: data.durationSec,
            totalVolume: data.totalVolume,
            status: data.status,
            userId: authenticatedUserId,
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
            userId: authenticatedUserId,
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

        // Guard: Never allow overriding system default routines!
        if (SYSTEM_ROUTINE_IDS.has(data.id)) {
          syncedIds.push(mutation.id);
          continue;
        }

        // Check ownership: Reject if owned by another user
        if (authenticatedUserId) {
          const existing = await prisma.routine.findUnique({ where: { id: data.id } }).catch(() => null);
          if (existing && existing.userId && existing.userId !== authenticatedUserId) {
            console.warn(`[Sync Service] User ${authenticatedUserId} attempted to modify routine ${data.id} owned by ${existing.userId}`);
            syncedIds.push(mutation.id);
            continue;
          }
        }

        await prisma.routine.upsert({
          where: { id: data.id },
          update: {
            name: data.name,
            userId: authenticatedUserId,
            updatedAt: new Date(),
          },
          create: {
            id: data.id,
            name: data.name,
            userId: authenticatedUserId,
          },
        });

        if (Array.isArray(data.items) && data.items.length > 0) {
          await prisma.routineItem.deleteMany({ where: { routineId: data.id } }).catch(() => null);

          const seenEx = new Set<string>();
          const uniqueItems = data.items.filter((it) => {
            if (seenEx.has(it.exerciseId)) return false;
            seenEx.add(it.exerciseId);
            return true;
          });

          for (let idx = 0; idx < uniqueItems.length; idx++) {
            const it = uniqueItems[idx];
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

        await prisma.bodyWeightLog.upsert({
          where: { id: data.id },
          update: {
            weight: data.weight,
            unit: data.unit,
            date: data.date,
            note: data.note ?? null,
            userId: authenticatedUserId,
            updatedAt: new Date(),
          },
          create: {
            id: data.id,
            weight: data.weight,
            unit: data.unit,
            date: data.date,
            note: data.note ?? null,
            userId: authenticatedUserId,
          },
        });
        syncedIds.push(mutation.id);
      }
    } catch (mutationErr: unknown) {
      console.error(`[Sync Service] Mutation ${mutation.id} failed:`, mutationErr);
      errors.push({
        id: mutation.id,
        error: mutationErr instanceof Error ? mutationErr.message : "Internal error",
      });
    }
  }

  return { syncedIds, errors };
}
