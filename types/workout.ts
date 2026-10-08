export type ExerciseCategory =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "BODYWEIGHT"
  | "CARDIO";

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

export interface RoutineWithExercises extends LocalRoutine {
  items: Array<LocalRoutineItem & { exercise: LocalExercise }>;
  targetMuscles: string[];
  estimatedDurationMin: number;
  lastCompletedAt: string | null;
}

export interface StreakDay {
  dayName: string;
  fullDay: string;
  dateStr: string;
  isCompleted: boolean;
  isToday: boolean;
}

export interface EditSetInput {
  id?: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  setType: SetType;
  isCompleted: boolean;
}

export interface EditSessionInput {
  id: string;
  title: string;
  startTime: string;
  durationSec: number;
  sets: EditSetInput[];
}

export interface SessionDetailData {
  session: LocalWorkoutSession;
  exerciseGroups: Array<{
    exercise: LocalExercise;
    sets: LocalSetLog[];
  }>;
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
 * Checks whether an exercise is cardio-based (Treadmill, Bike, Rowing, etc.)
 */
export function isCardioExercise(
  exercise?: { name?: string; category?: string; primaryMuscle?: string } | null
): boolean {
  if (!exercise) return false;
  if (exercise.category === "CARDIO") return true;
  if (exercise.primaryMuscle?.toLowerCase() === "cardio") return true;
  const name = (exercise.name || "").toLowerCase();
  return (
    name.includes("warm up") ||
    name.includes("treadmill") ||
    name.includes("cross train") ||
    name.includes("cycle") ||
    name.includes("jump rope") ||
    name.includes("rowing") ||
    name.includes("stair") ||
    name.includes("running") ||
    name.includes("jogging") ||
    name.includes("elliptical")
  );
}
