import Dexie, { Table } from "dexie";
import {
  LocalExercise,
  LocalRoutine,
  LocalRoutineItem,
  LocalWorkoutSession,
  LocalSetLog,
  LocalBodyWeightLog,
} from "@/types/workout";
import { OutboxSyncItem } from "@/types/sync";
import { DEFAULT_EXERCISES } from "@/lib/db/seeds/exercises";
import { DEFAULT_ROUTINES, DEFAULT_ROUTINE_ITEMS } from "@/lib/db/seeds/routines";
import { deduplicateDatabaseRecords } from "@/lib/db/deduplication";
import { clearLocalUserData } from "@/lib/db/repositories/workout-repository";

/**
 * Dexie schema definition for local client-side IndexedDB database.
 * Supports offline-first logging, fast querying, and optimistic mutations.
 */
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

/**
 * Initializer to guarantee seed exercises, default routines & clean migrations
 */
export async function initializeLocalDb(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Ensure default catalog exercises are populated
  await db.exercises.bulkPut(DEFAULT_EXERCISES);

  // 2. Load comprehensive exercises dataset if not yet loaded
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

  // 3. Ensure Day 01, Day 02, Day 03 routines are active
  const ROUTINE_VERSION_KEY = "pulse_routines_v5_day01_day02_day03";
  const migrated = localStorage.getItem(ROUTINE_VERSION_KEY);
  if (!migrated) {
    await db.routineItems.clear();
    await db.routines.clear();
    await db.routines.bulkPut(DEFAULT_ROUTINES);
    await db.routineItems.bulkPut(DEFAULT_ROUTINE_ITEMS);
    localStorage.setItem(ROUTINE_VERSION_KEY, "true");
  } else {
    for (const r of DEFAULT_ROUTINES) {
      const existing = await db.routines.get(r.id);
      if (!existing) {
        await db.routines.put(r);
        const routineDefaultItems = DEFAULT_ROUTINE_ITEMS.filter((ri) => ri.routineId === r.id);
        await db.routineItems.bulkPut(routineDefaultItems);
      }
    }
  }

  // 4. Clean up any duplicate records
  await deduplicateDatabaseRecords();

  // 5. One-time complete purge of legacy logs
  const LOGS_PURGE_VERSION = "pulse_user_logs_purged_v1";
  if (typeof window !== "undefined" && !localStorage.getItem(LOGS_PURGE_VERSION)) {
    await clearLocalUserData();
    localStorage.setItem(LOGS_PURGE_VERSION, "true");
  }
}

// Facade re-exports for backwards compatibility across existing UI components
export * from "@/types/workout";
export * from "@/types/sync";
export * from "@/lib/db/seeds/exercises";
export * from "@/lib/db/seeds/routines";
export * from "@/lib/db/deduplication";
export * from "@/lib/sync/client-sync";
export * from "@/lib/db/repositories/routine-repository";
export * from "@/lib/db/repositories/workout-repository";
export * from "@/lib/db/repositories/exercise-repository";
export * from "@/lib/db/repositories/weight-repository";
export * from "@/lib/db/repositories/backup-repository";
