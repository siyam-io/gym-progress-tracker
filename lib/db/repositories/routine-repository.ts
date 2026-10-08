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
  const uniqueExerciseIds = Array.from(new Set(exerciseIds));

  const routine: LocalRoutine = {
    id: routineId,
    name,
    userId: null,
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
 * Update an existing routine (rename, reorder, or update exercises)
 */
export async function updateRoutine(
  routineId: string,
  name: string,
  exerciseIds: string[]
): Promise<void> {
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
 * Delete a routine and all its routine items from Dexie
 */
export async function deleteRoutine(routineId: string): Promise<void> {
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
 * Reset routines to the default Day 01, Day 02, Day 03
 */
export async function resetToDefaultRoutines(): Promise<void> {
  await db.routineItems.clear();
  await db.routines.clear();
  await db.routines.bulkPut(DEFAULT_ROUTINES);
  await db.routineItems.bulkPut(DEFAULT_ROUTINE_ITEMS);
}
