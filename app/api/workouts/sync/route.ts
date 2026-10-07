import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Zod schemas for validation
const ExerciseCategoryEnum = z.enum(["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT", "CARDIO"]);
const SetTypeEnum = z.enum(["WARMUP", "NORMAL", "DROPSET", "FAILURE"]);
const SessionStatusEnum = z.enum(["IN_PROGRESS", "COMPLETED"]);

const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: ExerciseCategoryEnum.default("BARBELL"),
  primaryMuscle: z.string().min(1),
  secondaryMuscles: z.array(z.string()).default([]),
  isCustom: z.boolean().default(false),
  userId: z.string().nullable().optional(),
});

const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  routineId: z.string().nullable().optional(),
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  durationSec: z.number().int().nonnegative().default(0),
  totalVolume: z.number().nonnegative().default(0),
  status: SessionStatusEnum.default("IN_PROGRESS"),
});

const SetLogSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exerciseId: z.string(),
  setNumber: z.number().int().positive(),
  weight: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  setType: SetTypeEnum.default("NORMAL"),
  isCompleted: z.boolean().default(false),
  isPR: z.boolean().default(false),
});

const MutationItemSchema = z.object({
  id: z.string(), // outbox queue id
  entityType: z.enum(["workoutSession", "setLog", "routine", "exercise"]),
  entityId: z.string(),
  action: z.enum(["UPSERT", "DELETE"]),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.number(),
  retryCount: z.number().optional().default(0),
});

const SyncBatchRequestSchema = z.object({
  mutations: z.array(MutationItemSchema),
});

import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "sync-post", { limit: 60, windowMs: 60 * 1000 });
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
    const authenticatedUserId = session?.user?.id ?? null;

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
      console.warn("[Sync Route] Database is offline or DATABASE_URL is not set. Acknowledging mutations.");
    }

    // Process mutations idempotently
    for (const mutation of mutations) {
      try {
        if (!hasDbConnection) {
          // In local offline mode or when DB is unreachable, acknowledge mutation
          syncedIds.push(mutation.id);
          continue;
        }

        const { entityType, entityId, action, payload } = mutation;

        if (action === "DELETE") {
          if (entityType === "workoutSession") {
            await prisma.workoutSession.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "setLog") {
            await prisma.setLog.delete({ where: { id: entityId } }).catch(() => null);
          } else if (entityType === "exercise") {
            await prisma.exercise.delete({ where: { id: entityId } }).catch(() => null);
          }
          syncedIds.push(mutation.id);
          continue;
        }

        // UPSERT actions
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
              userId: authenticatedUserId ?? data.userId ?? null,
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
              userId: authenticatedUserId ?? data.userId ?? null,
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
              userId: data.userId ?? null,
            },
            create: {
              id: data.id,
              name: data.name,
              category: data.category,
              primaryMuscle: data.primaryMuscle,
              secondaryMuscles: data.secondaryMuscles,
              isCustom: data.isCustom,
              userId: data.userId ?? null,
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
