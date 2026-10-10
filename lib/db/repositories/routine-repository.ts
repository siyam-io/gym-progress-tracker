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

export const HOME_SELECTED_ROUTINES_KEY = "pulse_home_selected_routine_ids";

export function getStoredHomeRoutineIds(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HOME_SELECTED_ROUTINES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredHomeRoutineIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HOME_SELECTED_ROUTINES_KEY, JSON.stringify(ids));
  } catch (err) {
    console.warn("Failed to save home routine ids:", err);
  }
}

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

  const selectedHomeIds = getStoredHomeRoutineIds();
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

    const isShownOnHome =
      selectedHomeIds !== null
        ? selectedHomeIds.includes(routine.id)
        : routine.showOnHome !== false;

    results.push({
      ...routine,
      isSystem: isSys,
      showOnHome: isShownOnHome,
      items: rItems,
      targetMuscles: muscles,
      estimatedDurationMin,
      lastCompletedAt,
    });
  }

  return results;
}

/**
 * Fetch a single routine along with exercises by ID
 */
export async function getRoutineWithExercises(routineId: string): Promise<RoutineWithExercises | null> {
  const all = await getRoutinesWithExercises();
  return all.find((r) => r.id === routineId) || null;
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
    showOnHome: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.routines.put(routine);

  const currentSelected = getStoredHomeRoutineIds();
  if (currentSelected !== null) {
    saveStoredHomeRoutineIds([...currentSelected, routineId]);
  }

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
    showOnHome: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.routines.put(newRoutine);

  const currentSelected = getStoredHomeRoutineIds();
  if (currentSelected !== null) {
    saveStoredHomeRoutineIds([...currentSelected, newRoutineId]);
  }

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
 * Set whether a routine should be displayed on the Home Dashboard
 */
export async function setRoutineHomeVisibility(
  routineId: string,
  showOnHome: boolean
): Promise<void> {
  const allRoutines = await db.routines.toArray();
  let currentIds = getStoredHomeRoutineIds();

  if (currentIds === null) {
    currentIds = allRoutines
      .filter((r) => r.showOnHome !== false)
      .map((r) => r.id);
  }

  const idSet = new Set(currentIds);
  if (showOnHome) {
    idSet.add(routineId);
  } else {
    idSet.delete(routineId);
  }

  saveStoredHomeRoutineIds(Array.from(idSet));

  const existing = await db.routines.get(routineId);
  if (existing) {
    await db.routines.update(routineId, { showOnHome, updatedAt: new Date().toISOString() });
  } else {
    const def = DEFAULT_ROUTINES.find((d) => d.id === routineId);
    if (def) {
      await db.routines.put({ ...def, showOnHome, updatedAt: new Date().toISOString() });
    }
  }
}

/**
 * Update an existing routine (rename, reorder, or update exercises).
 * If called on a system default routine, automatically performs Copy-on-Write
 * to produce a separate custom routine without modifying the global default.
 */
export async function updateRoutine(
  routineId: string,
  name: string,
  exerciseIds: string[],
  showOnHome?: boolean
): Promise<LocalRoutine | void> {
  // Copy-on-Write guard for system default routines
  if (isSystemRoutine(routineId)) {
    const cloned = await cloneRoutineAsCustom(routineId, name, exerciseIds);
    if (showOnHome !== undefined) {
      await db.routines.update(cloned.id, { showOnHome });
      const currentSelected = getStoredHomeRoutineIds();
      if (currentSelected !== null) {
        const set = new Set(currentSelected);
        if (showOnHome) set.add(cloned.id);
        else set.delete(cloned.id);
        saveStoredHomeRoutineIds(Array.from(set));
      }
    }
    return cloned;
  }

  const nowIso = new Date().toISOString();
  const uniqueExerciseIds = Array.from(new Set(exerciseIds));

  const updatePayload: Partial<LocalRoutine> = { name, updatedAt: nowIso };
  if (showOnHome !== undefined) {
    updatePayload.showOnHome = showOnHome;
    const currentSelected = getStoredHomeRoutineIds();
    if (currentSelected !== null) {
      const set = new Set(currentSelected);
      if (showOnHome) set.add(routineId);
      else set.delete(routineId);
      saveStoredHomeRoutineIds(Array.from(set));
    }
  }

  await db.routines.update(routineId, updatePayload);
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
      await db.routines.put({
        ...defRoutine,
        isSystem: true,
        showOnHome: existing?.showOnHome ?? true,
      });
    }
    const defItems = DEFAULT_ROUTINE_ITEMS.filter((i) => i.routineId === defRoutine.id);
    const existingItems = await db.routineItems
      .where("routineId")
      .equals(defRoutine.id)
      .sortBy("orderIndex");

    const isOrderDifferent =
      existingItems.length !== defItems.length ||
      existingItems.some(
        (it, idx) =>
          it.exerciseId !== defItems[idx]?.exerciseId ||
          it.orderIndex !== defItems[idx]?.orderIndex
      );

    if (isOrderDifferent) {
      await db.routineItems.where("routineId").equals(defRoutine.id).delete();
      await db.routineItems.bulkPut(defItems);
    }
  }
}

/**
 * Reset routines to the default Day 01, Day 02, Day 03
 */
export async function resetToDefaultRoutines(): Promise<void> {
  saveStoredHomeRoutineIds(DEFAULT_ROUTINES.map((r) => r.id));
  await db.routineItems.clear();
  await db.routines.clear();
  await db.routines.bulkPut(DEFAULT_ROUTINES.map((r) => ({ ...r, showOnHome: true })));
  await db.routineItems.bulkPut(DEFAULT_ROUTINE_ITEMS);
}
