import { LocalRoutine, LocalRoutineItem } from "@/types/workout";

export const DEFAULT_ROUTINES: LocalRoutine[] = [
  {
    id: "routine-day-1",
    name: "Push Day",
    userId: null,
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "routine-day-2",
    name: "Pull Day",
    userId: null,
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "routine-day-3",
    name: "Leg Day",
    userId: null,
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_ROUTINE_ITEMS: LocalRoutineItem[] = [
  // --- Push Day (14 exercises) ---
  { id: "ri-d1-1", routineId: "routine-day-1", exerciseId: "ex-warm-up", orderIndex: 1, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-10", routineId: "routine-day-1", exerciseId: "ex-parallel-bar-dips", orderIndex: 2, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-2", routineId: "routine-day-1", exerciseId: "ex-treadmill", orderIndex: 3, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-3", routineId: "routine-day-1", exerciseId: "ex-cross-trainer", orderIndex: 4, targetSets: 1, restSeconds: 60 },
  { id: "ri-d1-4", routineId: "routine-day-1", exerciseId: "ex-push-up", orderIndex: 5, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-5", routineId: "routine-day-1", exerciseId: "ex-incline-press", orderIndex: 6, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-6", routineId: "routine-day-1", exerciseId: "ex-barbell-bench-press", orderIndex: 7, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-7", routineId: "routine-day-1", exerciseId: "ex-pec-deck-fly", orderIndex: 8, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-8", routineId: "routine-day-1", exerciseId: "ex-decline-press", orderIndex: 9, targetSets: 3, restSeconds: 90 },
  { id: "ri-d1-9", routineId: "routine-day-1", exerciseId: "ex-cable-tricep-pushdown", orderIndex: 10, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-11", routineId: "routine-day-1", exerciseId: "ex-overhead-tricep-extension", orderIndex: 11, targetSets: 3, restSeconds: 60 },
  { id: "ri-d1-12", routineId: "routine-day-1", exerciseId: "ex-crunches", orderIndex: 12, targetSets: 3, restSeconds: 45 },
  { id: "ri-d1-13", routineId: "routine-day-1", exerciseId: "ex-leg-raise", orderIndex: 13, targetSets: 3, restSeconds: 45 },
  { id: "ri-d1-14", routineId: "routine-day-1", exerciseId: "ex-plank", orderIndex: 14, targetSets: 3, restSeconds: 60 },

  // --- Day 02 (15 exercises) ---
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

  // --- Day 03 (11 exercises) ---
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
];
