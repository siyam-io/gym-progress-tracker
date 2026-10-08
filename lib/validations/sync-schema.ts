import { z } from "zod";

export const ExerciseCategoryEnum = z.enum([
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "CARDIO",
]);

export const SetTypeEnum = z.enum(["WARMUP", "NORMAL", "DROPSET", "FAILURE"]);

export const SessionStatusEnum = z.enum(["IN_PROGRESS", "COMPLETED"]);

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ExerciseCategoryEnum.default("BARBELL"),
  primaryMuscle: z.string().min(1),
  secondaryMuscles: z.array(z.string()).default([]),
  isCustom: z.boolean().default(false),
  userId: z.string().nullable().optional(),
});

export const WorkoutSessionSchema = z.object({
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

export const SetLogSchema = z.object({
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

export const RoutineItemSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1),
  orderIndex: z.number().int().default(1),
  targetSets: z.number().int().default(3),
  restSeconds: z.number().int().default(90),
});

export const RoutineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  userId: z.string().nullable().optional(),
  items: z.array(RoutineItemSchema).optional().default([]),
});

export const BodyWeightSchema = z.object({
  id: z.string().min(1),
  weight: z.number().positive(),
  unit: z.string().default("kg"),
  date: z.string().min(1),
  note: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export const MutationItemSchema = z.object({
  id: z.string(),
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

export const SyncBatchRequestSchema = z.object({
  mutations: z.array(MutationItemSchema),
});

export type MutationItem = z.infer<typeof MutationItemSchema>;
export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;
