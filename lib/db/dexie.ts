import Dexie, { Table } from "dexie";

export type ExerciseCategory = "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT";
export type SetType = "WARMUP" | "NORMAL" | "DROPSET" | "FAILURE";
export type SessionStatus = "IN_PROGRESS" | "COMPLETED";

export interface LocalExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
  isCustom: boolean;
  userId?: string | null;
  imageUrl?: string | null;
  animationUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRoutine {
  id: string;
  name: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRoutineItem {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  restSeconds: number;
}

export interface LocalWorkoutSession {
  id: string;
  userId?: string | null;
  routineId?: string | null;
  title: string;
  startTime: string;
  endTime?: string | null;
  durationSec: number;
  totalVolume: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  setType: SetType;
  isCompleted: boolean;
  isPR: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalBodyWeightLog {
  id: string;
  userId?: string | null;
  weight: number;
  unit: string; // 'kg' | 'lbs'
  date: string; // YYYY-MM-DD
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxSyncItem {
  id: string; // client uuid
  entityType: "workoutSession" | "setLog" | "routine" | "exercise" | "bodyWeight";
  entityId: string;
  action: "UPSERT" | "DELETE";
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  lastError?: string;
}

export class GymTrackerDexie extends Dexie {
  exercises!: Table<LocalExercise, string>;
  routines!: Table<LocalRoutine, string>;
  routineItems!: Table<LocalRoutineItem, string>;
  workoutSessions!: Table<LocalWorkoutSession, string>;
  setLogs!: Table<LocalSetLog, string>;
  outbox_sync_queue!: Table<OutboxSyncItem, string>;
  bodyWeightLogs!: Table<LocalBodyWeightLog, string>;

  constructor() {
    super("gym_tracker_local_db");

    this.version(1).stores({
      exercises: "id, name, category, primaryMuscle, isCustom, userId",
      routines: "id, name, userId",
      routineItems: "id, routineId, exerciseId, orderIndex",
      workoutSessions: "id, status, startTime, userId",
      setLogs: "id, sessionId, exerciseId, [sessionId+exerciseId], [exerciseId+isCompleted]",
      outbox_sync_queue: "id, entityType, entityId, status, createdAt",
    });

    this.version(2).stores({
      exercises: "id, name, category, primaryMuscle, isCustom, userId",
      routines: "id, name, userId",
      routineItems: "id, routineId, exerciseId, orderIndex",
      workoutSessions: "id, status, startTime, userId",
      setLogs: "id, sessionId, exerciseId, [sessionId+exerciseId], [exerciseId+isCompleted]",
      outbox_sync_queue: "id, entityType, entityId, status, createdAt",
      bodyWeightLogs: "id, date, userId",
    });
  }
}

export const db = new GymTrackerDexie();

// Complete default seed exercises transcribed directly from gym routine card
export const DEFAULT_EXERCISES: LocalExercise[] = [
  // --- Warm Up & Cardio ---
  {
    id: "ex-warm-up",
    name: "Full Body Warm Up",
    category: "BODYWEIGHT",
    primaryMuscle: "Full Body",
    secondaryMuscles: ["Core", "Shoulders"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-treadmill",
    imageUrl: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&auto=format&fit=crop&q=80",
    name: "Treadmill Run / Walk (10 mins)",
    category: "MACHINE",
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Calves"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-cross-trainer",
    name: "Cross Trainer / Elliptical (10 mins)",
    category: "MACHINE",
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Full Body"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-stationary-cycle",
    name: "Stationary Cycle (10 mins)",
    category: "MACHINE",
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Push / Chest Exercises ---
  {
    id: "ex-push-up",
    imageUrl: "https://images.unsplash.com/photo-1598971457999-ca8ef7d6d0c1?w=600&auto=format&fit=crop&q=80",
    name: "Push-Up",
    category: "BODYWEIGHT",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-incline-press",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
    name: "Incline Chest Press",
    category: "MACHINE",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids", "Triceps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-barbell-bench-press",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80",
    name: "Barbell Bench Press",
    category: "BARBELL",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-incline-dumbbell-press",
    imageUrl: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
    name: "Incline Dumbbell Press",
    category: "DUMBBELL",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids", "Triceps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-pec-deck-fly",
    name: "Pec Deck Fly",
    category: "MACHINE",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-decline-press",
    name: "Decline Chest Press",
    category: "BARBELL",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Triceps ---
  {
    id: "ex-cable-tricep-pushdown",
    imageUrl: "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=600&auto=format&fit=crop&q=80",
    name: "Cable Tricep Pushdown",
    category: "CABLE",
    primaryMuscle: "Triceps",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-parallel-bar-dips",
    name: "Dips (Parallel Bars)",
    category: "BODYWEIGHT",
    primaryMuscle: "Triceps",
    secondaryMuscles: ["Chest", "Anterior Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-overhead-tricep-extension",
    name: "Overhead Tricep Extension",
    category: "DUMBBELL",
    primaryMuscle: "Triceps",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Core & Abs ---
  {
    id: "ex-crunches",
    name: "Crunches",
    category: "BODYWEIGHT",
    primaryMuscle: "Core",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-leg-raise",
    name: "Leg Raise",
    category: "BODYWEIGHT",
    primaryMuscle: "Core",
    secondaryMuscles: ["Hip Flexors"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-plank",
    imageUrl: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=600&auto=format&fit=crop&q=80",
    name: "Plank",
    category: "BODYWEIGHT",
    primaryMuscle: "Core",
    secondaryMuscles: ["Shoulders", "Glutes"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Pull / Back Exercises ---
  {
    id: "ex-bodyweight-pullup",
    imageUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&auto=format&fit=crop&q=80",
    name: "Pull-Up",
    category: "BODYWEIGHT",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Core"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-cable-lat-pulldown",
    imageUrl: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&auto=format&fit=crop&q=80",
    name: "Lat Pulldown",
    category: "CABLE",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-reverse-lat-pulldown",
    name: "Reverse Grip Lat Pulldown",
    category: "CABLE",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-seated-cable-row",
    name: "Seated Cable Row",
    category: "CABLE",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Traps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-hyperextension",
    name: "Hyperextension",
    category: "BODYWEIGHT",
    primaryMuscle: "Lower Back",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-low-cable-row",
    name: "Low Cable Row",
    category: "CABLE",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Rear Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Biceps ---
  {
    id: "ex-barbell-curl",
    imageUrl: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
    name: "Barbell Bicep Curl (BB Curl)",
    category: "BARBELL",
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-hammer-curl",
    name: "Dumbbell Hammer Curl",
    category: "DUMBBELL",
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-preacher-curl",
    name: "Preacher Curl",
    category: "MACHINE",
    primaryMuscle: "Biceps",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Legs ---
  {
    id: "ex-barbell-squat",
    imageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
    name: "Barbell Back Squat",
    category: "BARBELL",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-walking-lunges",
    name: "Walking Lunges",
    category: "DUMBBELL",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-leg-extension",
    imageUrl: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&auto=format&fit=crop&q=80",
    name: "Leg Extension",
    category: "MACHINE",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-leg-curl",
    name: "Leg Curl",
    category: "MACHINE",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Calves"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-standing-calf-raise",
    name: "Calf Raise",
    category: "MACHINE",
    primaryMuscle: "Calves",
    secondaryMuscles: [],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // --- Shoulders & Traps ---
  {
    id: "ex-machine-shoulder-press",
    name: "Machine Shoulder Press",
    category: "MACHINE",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-dumbbell-lateral-raise",
    name: "Side Raise (Lateral Raise)",
    category: "DUMBBELL",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Traps"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-dumbbell-shrugs",
    name: "Shrugs",
    category: "DUMBBELL",
    primaryMuscle: "Traps",
    secondaryMuscles: ["Forearms"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-overhead-press",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
    name: "Overhead Press (OHP)",
    category: "BARBELL",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-barbell-row",
    name: "Barbell Bent-Over Row",
    category: "BARBELL",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Rear Deltoids"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-barbell-deadlift",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
    name: "Conventional Deadlift",
    category: "BARBELL",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back", "Traps", "Lats"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ex-romanian-deadlift",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
    name: "Romanian Deadlift",
    category: "BARBELL",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_ROUTINES: LocalRoutine[] = [
  {
    id: "routine-day-1",
    name: "Day #01 - Push & Core",
    userId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "routine-day-2",
    name: "Day #02 - Pull & Core",
    userId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "routine-day-3",
    name: "Day #03 - Legs & Shoulders",
    userId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "routine-day-4",
    name: "Day #04 - Cardio & Recovery",
    userId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_ROUTINE_ITEMS: LocalRoutineItem[] = [
  // --- Day #01: Chest, Triceps, Abs (Push & Core) ---
  { id: "ri-d1-1", routineId: "routine-day-1", exerciseId: "ex-warm-up", orderIndex: 1, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-2", routineId: "routine-day-1", exerciseId: "ex-treadmill", orderIndex: 2, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-3", routineId: "routine-day-1", exerciseId: "ex-cross-trainer", orderIndex: 3, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-4", routineId: "routine-day-1", exerciseId: "ex-push-up", orderIndex: 4, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-5", routineId: "routine-day-1", exerciseId: "ex-incline-press", orderIndex: 5, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-6", routineId: "routine-day-1", exerciseId: "ex-barbell-bench-press", orderIndex: 6, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-7", routineId: "routine-day-1", exerciseId: "ex-pec-deck-fly", orderIndex: 7, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-8", routineId: "routine-day-1", exerciseId: "ex-decline-press", orderIndex: 8, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-9", routineId: "routine-day-1", exerciseId: "ex-cable-tricep-pushdown", orderIndex: 9, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-10", routineId: "routine-day-1", exerciseId: "ex-parallel-bar-dips", orderIndex: 10, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-11", routineId: "routine-day-1", exerciseId: "ex-overhead-tricep-extension", orderIndex: 11, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-12", routineId: "routine-day-1", exerciseId: "ex-crunches", orderIndex: 12, targetSets: 3, restSeconds: 45 },
  { id: "ri-d1-13", routineId: "routine-day-1", exerciseId: "ex-leg-raise", orderIndex: 13, targetSets: 3, restSeconds: 45 },
  { id: "ri-d1-14", routineId: "routine-day-1", exerciseId: "ex-plank", orderIndex: 14, targetSets: 3, restSeconds: 60 },

  // --- Day #02: Back, Biceps, Abs (Pull & Core) ---
  { id: "ri-d2-1", routineId: "routine-day-2", exerciseId: "ex-warm-up", orderIndex: 1, targetSets: 1, restSeconds: 60 },
  { id: "ri-d2-2", routineId: "routine-day-2", exerciseId: "ex-cross-trainer", orderIndex: 2, targetSets: 1, restSeconds: 60 },
  { id: "ri-d2-3", routineId: "routine-day-2", exerciseId: "ex-treadmill", orderIndex: 3, targetSets: 1, restSeconds: 60 },
  { id: "ri-d2-4", routineId: "routine-day-2", exerciseId: "ex-bodyweight-pullup", orderIndex: 4, targetSets: 3, restSeconds: 90 },
  { id: "ri-d2-5", routineId: "routine-day-2", exerciseId: "ex-cable-lat-pulldown", orderIndex: 5, targetSets: 3, restSeconds: 90 },
  { id: "ri-d2-6", routineId: "routine-day-2", exerciseId: "ex-reverse-lat-pulldown", orderIndex: 6, targetSets: 3, restSeconds: 90 },
  { id: "ri-d2-7", routineId: "routine-day-2", exerciseId: "ex-seated-cable-row", orderIndex: 7, targetSets: 3, restSeconds: 90 },
  { id: "ri-d2-8", routineId: "routine-day-2", exerciseId: "ex-hyperextension", orderIndex: 8, targetSets: 3, restSeconds: 60 },
  { id: "ri-d2-9", routineId: "routine-day-2", exerciseId: "ex-low-cable-row", orderIndex: 9, targetSets: 3, restSeconds: 90 },
  { id: "ri-d2-10", routineId: "routine-day-2", exerciseId: "ex-barbell-curl", orderIndex: 10, targetSets: 3, restSeconds: 60 },
  { id: "ri-d2-11", routineId: "routine-day-2", exerciseId: "ex-hammer-curl", orderIndex: 11, targetSets: 3, restSeconds: 60 },
  { id: "ri-d2-12", routineId: "routine-day-2", exerciseId: "ex-preacher-curl", orderIndex: 12, targetSets: 3, restSeconds: 60 },
  { id: "ri-d2-13", routineId: "routine-day-2", exerciseId: "ex-crunches", orderIndex: 13, targetSets: 3, restSeconds: 45 },
  { id: "ri-d2-14", routineId: "routine-day-2", exerciseId: "ex-leg-raise", orderIndex: 14, targetSets: 3, restSeconds: 45 },
  { id: "ri-d2-15", routineId: "routine-day-2", exerciseId: "ex-plank", orderIndex: 15, targetSets: 3, restSeconds: 60 },

  // --- Day #03: Legs, Shoulders, Traps ---
  { id: "ri-d3-1", routineId: "routine-day-3", exerciseId: "ex-warm-up", orderIndex: 1, targetSets: 1, restSeconds: 60 },
  { id: "ri-d3-2", routineId: "routine-day-3", exerciseId: "ex-stationary-cycle", orderIndex: 2, targetSets: 1, restSeconds: 60 },
  { id: "ri-d3-3", routineId: "routine-day-3", exerciseId: "ex-cross-trainer", orderIndex: 3, targetSets: 1, restSeconds: 60 },
  { id: "ri-d3-4", routineId: "routine-day-3", exerciseId: "ex-barbell-squat", orderIndex: 4, targetSets: 3, restSeconds: 120 },
  { id: "ri-d3-5", routineId: "routine-day-3", exerciseId: "ex-walking-lunges", orderIndex: 5, targetSets: 3, restSeconds: 90 },
  { id: "ri-d3-6", routineId: "routine-day-3", exerciseId: "ex-leg-extension", orderIndex: 6, targetSets: 3, restSeconds: 60 },
  { id: "ri-d3-7", routineId: "routine-day-3", exerciseId: "ex-leg-curl", orderIndex: 7, targetSets: 3, restSeconds: 60 },
  { id: "ri-d3-8", routineId: "routine-day-3", exerciseId: "ex-standing-calf-raise", orderIndex: 8, targetSets: 3, restSeconds: 60 },
  { id: "ri-d3-9", routineId: "routine-day-3", exerciseId: "ex-machine-shoulder-press", orderIndex: 9, targetSets: 3, restSeconds: 90 },
  { id: "ri-d3-10", routineId: "routine-day-3", exerciseId: "ex-dumbbell-lateral-raise", orderIndex: 10, targetSets: 3, restSeconds: 60 },
  { id: "ri-d3-11", routineId: "routine-day-3", exerciseId: "ex-dumbbell-shrugs", orderIndex: 11, targetSets: 3, restSeconds: 60 },

  // --- Day #04: Active Recovery & Core ---
  { id: "ri-d4-1", routineId: "routine-day-4", exerciseId: "ex-warm-up", orderIndex: 1, targetSets: 1, restSeconds: 60 },
  { id: "ri-d4-2", routineId: "routine-day-4", exerciseId: "ex-treadmill", orderIndex: 2, targetSets: 1, restSeconds: 60 },
  { id: "ri-d4-3", routineId: "routine-day-4", exerciseId: "ex-stationary-cycle", orderIndex: 3, targetSets: 1, restSeconds: 60 },
  { id: "ri-d4-4", routineId: "routine-day-4", exerciseId: "ex-crunches", orderIndex: 4, targetSets: 3, restSeconds: 45 },
  { id: "ri-d4-5", routineId: "routine-day-4", exerciseId: "ex-leg-raise", orderIndex: 5, targetSets: 3, restSeconds: 45 },
  { id: "ri-d4-6", routineId: "routine-day-4", exerciseId: "ex-plank", orderIndex: 6, targetSets: 3, restSeconds: 60 },
];

export interface RoutineWithExercises extends LocalRoutine {
  items: Array<LocalRoutineItem & { exercise: LocalExercise }>;
  targetMuscles: string[];
  estimatedDurationMin: number;
  lastCompletedAt: string | null;
}

// Initializer to guarantee seed exercises, default routines & sample ghost history exists
export async function initializeLocalDb() {
  if (typeof window === "undefined") return;

  // Always upsert all default core routine exercises so they are immediately available
  await db.exercises.bulkPut(DEFAULT_EXERCISES);

  // Load comprehensive 870+ exercises dataset from /data/exercises.json if not yet populated
  try {
    const currentCount = await db.exercises.count();
    if (currentCount < 200) {
      const res = await fetch("/data/exercises.json");
      if (res.ok) {
        const fullLibrary: LocalExercise[] = await res.json();
        if (Array.isArray(fullLibrary) && fullLibrary.length > 0) {
          await db.exercises.bulkPut(fullLibrary);
        }
      }
    }
  } catch (err) {
    console.warn("[Dexie] Could not load extended exercise dataset:", err);
  }

  // Always ensure the 4 default routines exist
  for (const r of DEFAULT_ROUTINES) {
    const existing = await db.routines.get(r.id);
    if (!existing) {
      await db.routines.put(r);
    }
  }

  for (const ri of DEFAULT_ROUTINE_ITEMS) {
    const existing = await db.routineItems.get(ri.id);
    if (!existing) {
      await db.routineItems.put(ri);
    }
  }

  // Populate sample past workout session if no sessions exist
  const sessionCount = await db.workoutSessions.count();
  if (sessionCount === 0) {
    const samplePastSessionId = "past-session-sample-seed";
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    await db.workoutSessions.put({
      id: samplePastSessionId,
      title: "Previous Day #01 Session",
      startTime: pastDate,
      endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      durationSec: 3600,
      totalVolume: 5400,
      status: "COMPLETED",
      createdAt: pastDate,
      updatedAt: pastDate,
    });

    const samplePastSets: LocalSetLog[] = [
      {
        id: "past-set-bench-1",
        sessionId: samplePastSessionId,
        exerciseId: "ex-barbell-bench-press",
        setNumber: 1,
        weight: 60,
        reps: 15,
        rpe: 8,
        setType: "NORMAL",
        isCompleted: true,
        isPR: false,
        createdAt: pastDate,
        updatedAt: pastDate,
      },
      {
        id: "past-set-bench-2",
        sessionId: samplePastSessionId,
        exerciseId: "ex-barbell-bench-press",
        setNumber: 2,
        weight: 65,
        reps: 15,
        rpe: 8.5,
        setType: "NORMAL",
        isCompleted: true,
        isPR: true,
        createdAt: pastDate,
        updatedAt: pastDate,
      },
    ];

    await db.setLogs.bulkPut(samplePastSets);
  }

  // Seed default weight entry if empty
  const weightCount = await db.bodyWeightLogs.count();
  if (weightCount === 0) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

    await db.bodyWeightLogs.bulkPut([
      {
        id: "bw-seed-7d",
        weight: 73.0,
        unit: "kg",
        date: sevenDaysAgo,
        note: "Starting weight",
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      },
      {
        id: "bw-seed-3d",
        weight: 72.6,
        unit: "kg",
        date: threeDaysAgo,
        note: "Post-training check",
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
      {
        id: "bw-seed-today",
        weight: 72.2,
        unit: "kg",
        date: today,
        note: "Morning fasting weight",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);
  }
}

/**
 * Fetch routines along with their mapped exercise details and last completed dates
 */
export async function getRoutinesWithExercises(): Promise<RoutineWithExercises[]> {
  if (typeof window === "undefined") return [];

  const routines = await db.routines.toArray();
  const allItems = await db.routineItems.toArray();
  const allExercises = await db.exercises.toArray();
  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));

  const completedSessions = await db.workoutSessions
    .where("status")
    .equals("COMPLETED")
    .toArray();

  const results: RoutineWithExercises[] = [];

  for (const routine of routines) {
    const rItems = allItems
      .filter((i) => i.routineId === routine.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => ({
        ...item,
        exercise: exerciseMap.get(item.exerciseId) || {
          id: item.exerciseId,
          name: "Unknown Exercise",
          category: "BARBELL" as const,
          primaryMuscle: "General",
          secondaryMuscles: [],
          isCustom: false,
          createdAt: "",
          updatedAt: "",
        },
      }));

    const muscles = Array.from(new Set(rItems.map((i) => i.exercise.primaryMuscle)));
    const totalSets = rItems.reduce((acc, curr) => acc + curr.targetSets, 0);
    const estimatedDurationMin = Math.max(20, Math.round(totalSets * 3.5));

    const matchingSessions = completedSessions
      .filter((s) => s.routineId === routine.id || s.title.toLowerCase().includes(routine.name.toLowerCase()))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const lastCompletedAt = matchingSessions.length > 0 ? matchingSessions[0].startTime : null;

    results.push({
      ...routine,
      items: rItems,
      targetMuscles: muscles,
      estimatedDurationMin,
      lastCompletedAt,
    });
  }

  return results;
}

/**
 * Create a new custom routine and save to Dexie & sync queue
 */
export async function createCustomRoutine(name: string, exerciseIds: string[]): Promise<LocalRoutine> {
  const routineId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `routine-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const routine: LocalRoutine = {
    id: routineId,
    name,
    userId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.routines.put(routine);
  await enqueueSyncMutation("routine", routineId, "UPSERT", routine as unknown as Record<string, unknown>);

  const items: LocalRoutineItem[] = exerciseIds.map((exId, idx) => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}-${idx}`,
    routineId,
    exerciseId: exId,
    orderIndex: idx + 1,
    targetSets: 3,
    restSeconds: 90,
  }));

  await db.routineItems.bulkPut(items);

  return routine;
}

export interface StreakDay {
  dayName: string;
  fullDay: string;
  dateStr: string;
  isCompleted: boolean;
  isToday: boolean;
}

/**
 * Calculate weekly workout streak for Monday - Sunday of the current week
 */
export async function getWeeklyWorkoutStreak(): Promise<{
  days: StreakDay[];
  completedCount: number;
}> {
  if (typeof window === "undefined") {
    return { days: [], completedCount: 0 };
  }

  const now = new Date();
  const currentDay = now.getDay();
  // Distance to Monday (0=Sun -> 6, 1=Mon -> 0, etc.)
  const distToMonday = (currentDay + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distToMonday);
  monday.setHours(0, 0, 0, 0);

  const completedSessions = await db.workoutSessions
    .where("status")
    .equals("COMPLETED")
    .toArray();

  const completedDates = new Set(
    completedSessions.map((s) => new Date(s.startTime).toISOString().slice(0, 10))
  );

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const shortLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const todayStr = now.toISOString().slice(0, 10);

  const days: StreakDay[] = [];
  let completedCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isCompleted = completedDates.has(dateStr);
    if (isCompleted) completedCount++;

    days.push({
      dayName: shortLabels[i],
      fullDay: dayNames[i],
      dateStr,
      isCompleted,
      isToday: dateStr === todayStr,
    });
  }

  return { days, completedCount };
}

/**
 * Fetch ghost placeholder data for an exercise
 */
export async function getPreviousExerciseSets(exerciseId: string): Promise<Array<{ setNumber: number; weight: number; reps: number }>> {
  if (typeof window === "undefined") return [];

  const completedSets = await db.setLogs
    .where("exerciseId")
    .equals(exerciseId)
    .filter((s) => s.isCompleted)
    .sortBy("createdAt");

  if (completedSets.length === 0) return [];

  const latestSessionId = completedSets[completedSets.length - 1].sessionId;
  const latestSessionSets = completedSets.filter((s) => s.sessionId === latestSessionId);

  return latestSessionSets
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => ({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
    }));
}

/**
 * Enqueue a mutation into IndexedDB outbox_sync_queue
 */
export async function enqueueSyncMutation(
  entityType: OutboxSyncItem["entityType"],
  entityId: string,
  action: OutboxSyncItem["action"],
  payload: Record<string, unknown>
): Promise<void> {
  const syncItem: OutboxSyncItem = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random()}`,
    entityType,
    entityId,
    action,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "PENDING",
  };

  await db.outbox_sync_queue.put(syncItem);

  if (typeof window !== "undefined" && navigator.onLine) {
    void processSyncQueue();
  }
}

let isSyncing = false;

/**
 * Process the outbox sync queue and send batch to /api/workouts/sync
 */
export async function processSyncQueue(): Promise<{ success: boolean; processedCount: number; errors?: unknown }> {
  if (typeof window === "undefined" || !navigator.onLine || isSyncing) {
    return { success: false, processedCount: 0 };
  }

  isSyncing = true;
  try {
    const pendingItems = await db.outbox_sync_queue
      .where("status")
      .equals("PENDING")
      .limit(50)
      .toArray();

    if (pendingItems.length === 0) {
      isSyncing = false;
      return { success: true, processedCount: 0 };
    }

    const itemIds = pendingItems.map((i) => i.id);
    await db.outbox_sync_queue.where("id").anyOf(itemIds).modify({ status: "SYNCING" });

    const response = await fetch("/api/workouts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: pendingItems }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await db.outbox_sync_queue.where("id").anyOf(itemIds).modify((item) => {
        item.status = "FAILED";
        item.retryCount += 1;
        item.lastError = errText;
      });
      isSyncing = false;
      return { success: false, processedCount: 0, errors: errText };
    }

    const result = await response.json();
    const syncedIds: string[] = result.syncedIds || itemIds;

    await db.outbox_sync_queue.where("id").anyOf(syncedIds).delete();

    isSyncing = false;
    return { success: true, processedCount: syncedIds.length };
  } catch (err: unknown) {
    console.error("[Dexie Sync Engine] Sync batch failed:", err);
    isSyncing = false;
    return { success: false, processedCount: 0, errors: err };
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[Dexie Sync Engine] Device back online. Flushing outbox...");
    void db.outbox_sync_queue
      .where("status")
      .equals("FAILED")
      .modify({ status: "PENDING" })
      .then(() => processSyncQueue());
  });
}

/**
 * Delete a workout session and all associated sets from Dexie & sync queue
 */
export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const sets = await db.setLogs.where("sessionId").equals(sessionId).toArray();
  const setIds = sets.map((s) => s.id);

  await db.setLogs.where("id").anyOf(setIds).delete();
  await db.workoutSessions.delete(sessionId);

  for (const sid of setIds) {
    await enqueueSyncMutation("setLog", sid, "DELETE", { id: sid });
  }
  await enqueueSyncMutation("workoutSession", sessionId, "DELETE", { id: sessionId });
}

export interface SessionDetailData {
  session: LocalWorkoutSession;
  exerciseGroups: Array<{
    exercise: LocalExercise;
    sets: LocalSetLog[];
  }>;
}

/**
 * Fetch full session detail with exercises and sets for inspector
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetailData | null> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return null;

  const sets = await db.setLogs.where("sessionId").equals(sessionId).sortBy("setNumber");
  const exerciseIds = Array.from(new Set(sets.map((s) => s.exerciseId)));
  const exercises = await db.exercises.where("id").anyOf(exerciseIds).toArray();
  const exMap = new Map(exercises.map((e) => [e.id, e]));

  const groups: Array<{ exercise: LocalExercise; sets: LocalSetLog[] }> = [];

  for (const exId of exerciseIds) {
    const exercise = exMap.get(exId) || {
      id: exId,
      name: "Unknown Exercise",
      category: "BARBELL" as const,
      primaryMuscle: "General",
      secondaryMuscles: [],
      isCustom: false,
      createdAt: "",
      updatedAt: "",
    };

    const exSets = sets.filter((s) => s.exerciseId === exId);
    groups.push({ exercise, sets: exSets });
  }

  return { session, exerciseGroups: groups };
}

/**
 * Export complete Dexie database as a downloadable JSON string
 */
export async function exportAllDataAsJson(): Promise<string> {
  const exercises = await db.exercises.toArray();
  const routines = await db.routines.toArray();
  const routineItems = await db.routineItems.toArray();
  const workoutSessions = await db.workoutSessions.toArray();
  const setLogs = await db.setLogs.toArray();
  const bodyWeightLogs = await db.bodyWeightLogs.toArray();

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: "Pulse Gym Tracker",
    data: {
      exercises,
      routines,
      routineItems,
      workoutSessions,
      setLogs,
      bodyWeightLogs,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore Dexie database from a JSON backup file
 */
export async function importDataFromJson(jsonStr: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const backup = JSON.parse(jsonStr);
    if (!backup || !backup.data) {
      return { success: false, count: 0, error: "Invalid backup file structure" };
    }

    const { exercises, routines, routineItems, workoutSessions, setLogs, bodyWeightLogs } = backup.data;

    let totalImported = 0;

    if (Array.isArray(exercises) && exercises.length > 0) {
      await db.exercises.bulkPut(exercises);
      totalImported += exercises.length;
    }
    if (Array.isArray(routines) && routines.length > 0) {
      await db.routines.bulkPut(routines);
      totalImported += routines.length;
    }
    if (Array.isArray(routineItems) && routineItems.length > 0) {
      await db.routineItems.bulkPut(routineItems);
      totalImported += routineItems.length;
    }
    if (Array.isArray(workoutSessions) && workoutSessions.length > 0) {
      await db.workoutSessions.bulkPut(workoutSessions);
      totalImported += workoutSessions.length;
    }
    if (Array.isArray(setLogs) && setLogs.length > 0) {
      await db.setLogs.bulkPut(setLogs);
      totalImported += setLogs.length;
    }
    if (Array.isArray(bodyWeightLogs) && bodyWeightLogs.length > 0) {
      await db.bodyWeightLogs.bulkPut(bodyWeightLogs);
      totalImported += bodyWeightLogs.length;
    }

    return { success: true, count: totalImported };
  } catch (err: unknown) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to parse backup JSON",
    };
  }
}

/**
 * Create custom exercise with outbox sync
 */
export async function createCustomExercise(data: {
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
}): Promise<LocalExercise> {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `custom-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newExercise: LocalExercise = {
    id,
    name: data.name,
    category: data.category,
    primaryMuscle: data.primaryMuscle,
    secondaryMuscles: data.secondaryMuscles,
    isCustom: true,
    userId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.exercises.put(newExercise);
  await enqueueSyncMutation("exercise", id, "UPSERT", newExercise as unknown as Record<string, unknown>);

  return newExercise;
}

export interface ExerciseHistorySession {
  sessionId: string;
  sessionTitle: string;
  dateStr: string;
  sets: Array<LocalSetLog & { e1rm: number }>;
}

export interface ExerciseDetailHistory {
  exercise: LocalExercise;
  totalSets: number;
  maxWeight: number;
  maxReps: number;
  highest1RM: number;
  progression: Array<{ dateStr: string; e1rm: number }>;
  sessions: ExerciseHistorySession[];
}

/**
 * Fetch detailed history for a specific exercise across all workouts
 */
export async function getExerciseDetailHistory(
  exerciseId: string,
  fallbackExercise?: LocalExercise
): Promise<ExerciseDetailHistory | null> {
  try {
    let exercise = await db.exercises.get(exerciseId);
    if (!exercise && fallbackExercise) {
      exercise = fallbackExercise;
    }
    if (!exercise) {
      exercise = DEFAULT_EXERCISES.find((e) => e.id === exerciseId);
    }
    if (!exercise && typeof window !== "undefined") {
      try {
        const res = await fetch(`/data/exercises.json`);
        if (res.ok) {
          const list: LocalExercise[] = await res.json();
          exercise = list.find((e) => e.id === exerciseId);
        }
      } catch {
        // fallback ignored
      }
    }
    if (!exercise) return null;

    let sets: LocalSetLog[] = [];
    try {
      sets = await db.setLogs
        .where("exerciseId")
        .equals(exerciseId)
        .filter((s) => s.isCompleted)
        .toArray();
    } catch {
      sets = [];
    }

    if (sets.length === 0) {
      return {
        exercise,
        totalSets: 0,
        maxWeight: 0,
        maxReps: 0,
        highest1RM: 0,
        progression: [],
        sessions: [],
      };
    }

    const sessionIds = Array.from(new Set(sets.map((s) => s.sessionId)));
    let sessions: LocalWorkoutSession[] = [];
    try {
      sessions = await db.workoutSessions.where("id").anyOf(sessionIds).toArray();
    } catch {
      sessions = [];
    }
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  let maxWeight = 0;
  let maxReps = 0;
  let highest1RM = 0;

  const progressionMap = new Map<string, number>();
  const sessionGroupsMap = new Map<string, Array<LocalSetLog & { e1rm: number }>>();

  for (const s of sets) {
    const e1rm = s.reps === 1 ? s.weight : Math.round(s.weight * (36 / (37 - Math.min(s.reps, 30))) * 10) / 10;
    if (s.weight > maxWeight) maxWeight = s.weight;
    if (s.reps > maxReps) maxReps = s.reps;
    if (e1rm > highest1RM) highest1RM = e1rm;

    const dateKey = new Date(s.createdAt).toISOString().slice(0, 10);
    const currProg = progressionMap.get(dateKey) || 0;
    if (e1rm > currProg) progressionMap.set(dateKey, e1rm);

    const existingSets = sessionGroupsMap.get(s.sessionId) || [];
    existingSets.push({ ...s, e1rm });
    sessionGroupsMap.set(s.sessionId, existingSets);
  }

  const progression = Array.from(progressionMap.entries())
    .map(([dateStr, e1rm]) => ({ dateStr, e1rm }))
    .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

  const historySessions: ExerciseHistorySession[] = Array.from(sessionGroupsMap.entries())
    .map(([sId, sSets]) => {
      const sess = sessionMap.get(sId);
      return {
        sessionId: sId,
        sessionTitle: sess?.title || "Workout Session",
        dateStr: sess?.startTime || sSets[0]?.createdAt || "",
        sets: sSets.sort((a, b) => a.setNumber - b.setNumber),
      };
    })
    .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());

    return {
      exercise,
      totalSets: sets.length,
      maxWeight,
      maxReps,
      highest1RM,
      progression,
      sessions: historySessions,
    };
  } catch (err) {
    console.error("[Dexie] Error in getExerciseDetailHistory:", err);
    if (fallbackExercise) {
      return {
        exercise: fallbackExercise,
        totalSets: 0,
        maxWeight: 0,
        maxReps: 0,
        highest1RM: 0,
        progression: [],
        sessions: [],
      };
    }
    return null;
  }
}

// ==========================================
// DAILY BODY WEIGHT TRACKING ENGINE
// ==========================================

export async function saveBodyWeightLog(data: {
  id?: string;
  weight: number;
  unit?: string;
  date?: string; // YYYY-MM-DD
  note?: string | null;
  userId?: string | null;
}): Promise<LocalBodyWeightLog> {
  const date = data.date || new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const existing = await db.bodyWeightLogs
    .where("date")
    .equals(date)
    .first();

  const id = existing?.id || data.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bw-${Date.now()}`);
  const record: LocalBodyWeightLog = {
    id,
    userId: data.userId ?? existing?.userId ?? null,
    weight: Math.round(Number(data.weight) * 10) / 10,
    unit: data.unit || existing?.unit || "kg",
    date,
    note: data.note !== undefined ? data.note : (existing?.note || null),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.bodyWeightLogs.put(record);
  await enqueueSyncMutation("bodyWeight", id, "UPSERT", record as unknown as Record<string, unknown>);

  // Also sync directly to /api/weight in the background if online
  if (typeof window !== "undefined" && navigator.onLine) {
    void fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => {});
  }

  return record;
}

export async function getBodyWeightLogs(limit = 30): Promise<LocalBodyWeightLog[]> {
  if (typeof window === "undefined") return [];
  const logs = await db.bodyWeightLogs.toArray();
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

export async function getLatestBodyWeightLog(): Promise<LocalBodyWeightLog | null> {
  if (typeof window === "undefined") return null;
  const logs = await db.bodyWeightLogs.toArray();
  if (logs.length === 0) return null;
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export async function deleteBodyWeightLog(id: string): Promise<void> {
  await db.bodyWeightLogs.delete(id);
  await enqueueSyncMutation("bodyWeight", id, "DELETE", { id });

  if (typeof window !== "undefined" && navigator.onLine) {
    void fetch(`/api/weight?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

export async function getBodyWeightStats(): Promise<{
  latestWeight: number | null;
  latestDate: string | null;
  weeklyDelta: number | null; // e.g. -0.4
  history: LocalBodyWeightLog[];
}> {
  if (typeof window === "undefined") {
    return { latestWeight: null, latestDate: null, weeklyDelta: null, history: [] };
  }

  const logs = await getBodyWeightLogs(30);
  if (logs.length === 0) {
    return { latestWeight: null, latestDate: null, weeklyDelta: null, history: [] };
  }

  const latest = logs[0];
  let weeklyDelta: number | null = null;

  // Find entry from ~7 days ago
  const latestTime = new Date(latest.date).getTime();
  const sevenDaysAgo = latestTime - 7 * 86400000;
  
  // Find the closest log within 5-9 days ago
  const weekOldLog = logs.find((l) => {
    const t = new Date(l.date).getTime();
    return Math.abs(t - sevenDaysAgo) <= 2 * 86400000;
  });

  if (weekOldLog) {
    weeklyDelta = Math.round((latest.weight - weekOldLog.weight) * 10) / 10;
  } else if (logs.length > 1) {
    const oldestInSample = logs[logs.length - 1];
    weeklyDelta = Math.round((latest.weight - oldestInSample.weight) * 10) / 10;
  }

  return {
    latestWeight: latest.weight,
    latestDate: latest.date,
    weeklyDelta,
    history: logs,
  };
}

/**
 * Completely clears local user workout sessions, set logs, body weights, and outbox sync queue.
 * Retains catalog exercises so the athlete can start completely fresh.
 */
export async function clearLocalUserData(): Promise<void> {
  if (typeof window === "undefined") return;
  await Promise.all([
    db.workoutSessions.clear(),
    db.setLogs.clear(),
    db.bodyWeightLogs.clear(),
    db.outbox_sync_queue.clear(),
  ]);
}

