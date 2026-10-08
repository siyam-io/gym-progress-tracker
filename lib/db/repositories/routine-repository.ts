import { db } from "@/lib/db/dexie";
import { enqueueSyncMutation } from "@/lib/sync/client-sync";
import {
  LocalRoutine,
  LocalRoutineItem,
  RoutineWithExercises,
} from "@/types/workout";
import {
  DEFAULT_ROUTINES,
  DEFAULT_ROUTINE_ITEMS,
} from "@/lib/db/seeds/routines";

export const SYSTEM_ROUTINE_IDS = new Set([
  "routine-day-1",
  "routine-day-2",
  "routine-day-3",
]);

/**
 * Returns true if the routine ID belongs to a permanent built-in default routine
 */
export function isSystemRoutine(routineId: string): boolean {
  return SYSTEM_ROUTINE_IDS.has(routineId);
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
    const isSys = isSystemRoutine(routine.id) || routine.isSystem === true;
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
      isSystem: isSys,
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
  const uniqueExerciseIds = Array.from(new Set(exerciseIds));

  const routine: LocalRoutine = {
    id: routineId,
    name,
    userId: null,
    isSystem: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.routines.put(routine);

  const items: LocalRoutineItem[] = uniqueExerciseIds.map((exId, idx) => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}-${idx}`,
    routineId,
    exerciseId: exId,
    orderIndex: idx + 1,
    targetSets: 3,
    restSeconds: 90,
  }));

  await db.routineItems.bulkPut(items);
  await enqueueSyncMutation("routine", routineId, "UPSERT", { ...routine, items } as unknown as Record<string, unknown>);

  return routine;
}

/**
 * Clone an existing routine (system or custom) into a new, independent custom routine.
 * Guarantees that built-in routines remain immutable and unmutated.
 */
export async function cloneRoutineAsCustom(
  sourceRoutineId: string,
  customName?: string,
  overrideExerciseIds?: string[]
): Promise<LocalRoutine> {
  const sourceRoutine = await db.routines.get(sourceRoutineId);
  const nowIso = new Date().toISOString();
  const newRoutineId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `routine-${Date.now()}`;

  let finalExerciseIds: string[] = [];
  if (overrideExerciseIds && overrideExerciseIds.length > 0) {
    finalExerciseIds = Array.from(new Set(overrideExerciseIds));
  } else {
    const existingItems = await db.routineItems
      .where("routineId")
      .equals(sourceRoutineId)
      .sortBy("orderIndex");
    finalExerciseIds = existingItems.map((i) => i.exerciseId);
  }

  const baseName = customName?.trim() || (sourceRoutine ? `${sourceRoutine.name} (Custom)` : "Custom Routine");

  const newRoutine: LocalRoutine = {
    id: newRoutineId,
    name: baseName,
    userId: null,
    isSystem: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.routines.put(newRoutine);

  const items: LocalRoutineItem[] = finalExerciseIds.map((exId, idx) => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}-${idx}`,
    routineId: newRoutineId,
    exerciseId: exId,
    orderIndex: idx + 1,
    targetSets: 3,
    restSeconds: 90,
  }));

  await db.routineItems.bulkPut(items);
  await enqueueSyncMutation("routine", newRoutineId, "UPSERT", { ...newRoutine, items } as unknown as Record<string, unknown>);

  return newRoutine;
}

/**
 * Update an existing routine (rename, reorder, or update exercises).
 * If called on a system default routine, automatically performs Copy-on-Write
 * to produce a separate custom routine without modifying the global default.
 */
export async function updateRoutine(
  routineId: string,
  name: string,
  exerciseIds: string[]
): Promise<LocalRoutine | void> {
  // Copy-on-Write guard for system default routines
  if (isSystemRoutine(routineId)) {
    return await cloneRoutineAsCustom(routineId, name, exerciseIds);
  }

  const nowIso = new Date().toISOString();
  const uniqueExerciseIds = Array.from(new Set(exerciseIds));

  await db.routines.update(routineId, { name, updatedAt: nowIso });
  await db.routineItems.where("routineId").equals(routineId).delete();

  const items: LocalRoutineItem[] = uniqueExerciseIds.map((exId, idx) => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}-${idx}`,
    routineId,
    exerciseId: exId,
    orderIndex: idx + 1,
    targetSets: 3,
    restSeconds: 90,
  }));

  await db.routineItems.bulkPut(items);
  await enqueueSyncMutation("routine", routineId, "UPSERT", { id: routineId, name, updatedAt: nowIso, items } as unknown as Record<string, unknown>);
}

/**
 * Delete a routine and all its routine items from Dexie.
 * Blocks attempts to delete system default routines.
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  if (isSystemRoutine(routineId)) {
    console.warn(`[Routine Repository] Blocked attempt to delete system routine: ${routineId}`);
    throw new Error("Default system routines cannot be deleted.");
  }

  await db.routineItems.where("routineId").equals(routineId).delete();
  await db.routines.delete(routineId);
  await enqueueSyncMutation("routine", routineId, "DELETE", { id: routineId });
}

/**
 * Add an exercise (e.g. Cardio or strength) to an existing routine
 */
export async function addExerciseToRoutine(routineId: string, exerciseId: string): Promise<LocalRoutineItem> {
  const existingItems = await db.routineItems.where("routineId").equals(routineId).sortBy("orderIndex");
  const nextOrder = existingItems.length > 0 ? existingItems[existingItems.length - 1].orderIndex + 1 : 1;
  const newItem: LocalRoutineItem = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}-${nextOrder}`,
    routineId,
    exerciseId,
    orderIndex: nextOrder,
    targetSets: 3,
    restSeconds: 60,
  };
  await db.routineItems.put(newItem);
  return newItem;
}

/**
 * Remove an item from a routine
 */
export async function removeExerciseFromRoutine(itemId: string): Promise<void> {
  await db.routineItems.delete(itemId);
}

/**
 * Ensures system default routines (Day 01, Day 02, Day 03) exist and remain pristine.
 */
export async function ensureSystemRoutines(): Promise<void> {
  for (const defRoutine of DEFAULT_ROUTINES) {
    const existing = await db.routines.get(defRoutine.id);
    if (!existing || existing.name !== defRoutine.name) {
      await db.routines.put({ ...defRoutine, isSystem: true });
    }
    const existingItemsCount = await db.routineItems.where("routineId").equals(defRoutine.id).count();
    if (existingItemsCount === 0) {
      const defItems = DEFAULT_ROUTINE_ITEMS.filter((i) => i.routineId === defRoutine.id);
      await db.routineItems.bulkPut(defItems);
    }
  }
}

/**
 * Reset routines to the default Day 01, Day 02, Day 03
 */
export async function resetToDefaultRoutines(): Promise<void> {
  await db.routineItems.clear();
  await db.routines.clear();
  await db.routines.bulkPut(DEFAULT_ROUTINES);
  await db.routineItems.bulkPut(DEFAULT_ROUTINE_ITEMS);
}
