import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  db,
  LocalExercise,
  LocalWorkoutSession,
  LocalSetLog,
  SetType,
  getPreviousExerciseSets,
  enqueueSyncMutation,
} from "@/lib/db/dexie";
import { checkIfPR } from "@/lib/utils/pr-calculator";
import { playPRFanfare, playTimerCompleteSound, playTapSound } from "@/lib/utils/audio-feedback";
import { toast } from "@/stores/useToastStore";

export interface ExerciseGroup {
  exercise: LocalExercise;
  sets: LocalSetLog[];
  ghostSets: Array<{ setNumber: number; weight: number; reps: number }>;
}

export interface RestTimerState {
  isRunning: boolean;
  totalDurationSec: number;
  remainingSec: number;
  targetEndTime: number | null; // Date.now() + durationMs to prevent drift
  exerciseName: string | null;
}

export interface WorkoutStore {
  // Session State
  session: LocalWorkoutSession | null;
  exerciseGroups: ExerciseGroup[];
  workoutElapsedSec: number;
  isPaused: boolean;
  isLoading: boolean;
  currentUserId: string | null;

  // Drift-Free Rest Timer State
  restTimer: RestTimerState;

  // Actions - Session
  setCurrentUserId: (userId: string | null) => void;
  initializeOrRestore: () => Promise<void>;
  startWorkout: (title?: string, initialExercises?: LocalExercise[], routineId?: string) => Promise<void>;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  incrementWorkoutElapsed: () => void;
  finishWorkout: () => Promise<LocalWorkoutSession | null>;
  discardWorkout: () => Promise<void>;

  // Actions - Exercise & Sets
  addExercise: (exercise: LocalExercise) => Promise<void>;
  removeExercise: (exerciseId: string) => Promise<void>;
  addSet: (exerciseId: string, setType?: SetType) => Promise<void>;
  removeSet: (exerciseId: string, setId: string) => Promise<void>;
  updateSet: (exerciseId: string, setId: string, updates: Partial<LocalSetLog>) => Promise<void>;
  toggleSetCompleted: (exerciseId: string, setId: string) => Promise<void>;

  // Actions - Rest Timer
  startRestTimer: (durationSec: number, exerciseName?: string) => void;
  adjustRestTimer: (deltaSec: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  session: null,
  exerciseGroups: [],
  workoutElapsedSec: 0,
  isPaused: false,
  isLoading: true,
  currentUserId: null,

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  restTimer: {
    isRunning: false,
    totalDurationSec: 90,
    remainingSec: 90,
    targetEndTime: null,
    exerciseName: null,
  },

  initializeOrRestore: async () => {
    try {
      set({ isLoading: true });

      // Look for an in-progress session in Dexie
      const inProgressSession = await db.workoutSessions
        .where("status")
        .equals("IN_PROGRESS")
        .first();

      if (!inProgressSession) {
        set({ isLoading: false });
        return;
      }

      // Load all sets for this session
      const sets = await db.setLogs.where("sessionId").equals(inProgressSession.id).toArray();

      // Extract unique exercise IDs
      const exerciseIds = Array.from(new Set(sets.map((s) => s.exerciseId)));
      const exercises = await db.exercises.where("id").anyOf(exerciseIds).toArray();
      const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

      // Group sets by exercise
      const groups: ExerciseGroup[] = [];
      for (const exId of exerciseIds) {
        const exercise = exerciseMap.get(exId);
        if (!exercise) continue;

        const exerciseSets = sets
          .filter((s) => s.exerciseId === exId)
          .sort((a, b) => a.setNumber - b.setNumber);

        const ghostSets = await getPreviousExerciseSets(exId);

        groups.push({
          exercise,
          sets: exerciseSets,
          ghostSets,
        });
      }

      // Calculate elapsed seconds from session.startTime
      const startTimeMs = new Date(inProgressSession.startTime).getTime();
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));

      set({
        session: inProgressSession,
        exerciseGroups: groups,
        workoutElapsedSec: elapsed,
        isLoading: false,
      });
    } catch (err) {
      console.error("[WorkoutStore] Failed to restore session:", err);
      set({ isLoading: false });
    }
  },

  startWorkout: async (title = "Gym Workout", initialExercises = [], routineId) => {
    const sessionId = uuidv4();
    const nowIso = new Date().toISOString();

    const newSession: LocalWorkoutSession = {
      id: sessionId,
      userId: get().currentUserId || null,
      routineId: routineId ?? null,
      title,
      startTime: nowIso,
      endTime: null,
      durationSec: 0,
      totalVolume: 0,
      status: "IN_PROGRESS",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save session in Dexie & queue mutation
    await db.workoutSessions.put(newSession);
    await enqueueSyncMutation("workoutSession", sessionId, "UPSERT", newSession as unknown as Record<string, unknown>);

    const groups: ExerciseGroup[] = [];

    // If initial exercises provided, populate with 3 default sets with ghost data
    for (const ex of initialExercises) {
      const ghostSets = await getPreviousExerciseSets(ex.id);
      const defaultSets: LocalSetLog[] = [];

      for (let i = 1; i <= 3; i++) {
        const ghost = ghostSets.find((g) => g.setNumber === i);
        const setLog: LocalSetLog = {
          id: uuidv4(),
          sessionId,
          exerciseId: ex.id,
          setNumber: i,
          weight: ghost ? ghost.weight : 20,
          reps: ghost ? ghost.reps : 10,
          rpe: 8,
          setType: i === 1 ? "WARMUP" : "NORMAL",
          isCompleted: false,
          isPR: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        defaultSets.push(setLog);
      }

      await db.setLogs.bulkPut(defaultSets);
      for (const s of defaultSets) {
        await enqueueSyncMutation("setLog", s.id, "UPSERT", s as unknown as Record<string, unknown>);
      }

      groups.push({
        exercise: ex,
        sets: defaultSets,
        ghostSets,
      });
    }

    set({
      session: newSession,
      exerciseGroups: groups,
      workoutElapsedSec: 0,
      isPaused: false,
    });
  },

  pauseWorkout: () => set({ isPaused: true }),
  resumeWorkout: () => set({ isPaused: false }),
  incrementWorkoutElapsed: () => {
    const { isPaused, session } = get();
    if (!isPaused && session) {
      set((state) => ({ workoutElapsedSec: state.workoutElapsedSec + 1 }));
    }
  },

  addExercise: async (exercise: LocalExercise) => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    // Avoid duplicates
    if (exerciseGroups.some((g) => g.exercise.id === exercise.id)) return;

    const ghostSets = await getPreviousExerciseSets(exercise.id);
    const nowIso = new Date().toISOString();

    // Default with 3 sets
    const newSets: LocalSetLog[] = [];
    for (let i = 1; i <= 3; i++) {
      const ghost = ghostSets.find((g) => g.setNumber === i);
      const setLog: LocalSetLog = {
        id: uuidv4(),
        sessionId: session.id,
        exerciseId: exercise.id,
        setNumber: i,
        weight: ghost ? ghost.weight : 20,
        reps: ghost ? ghost.reps : 10,
        rpe: 8,
        setType: i === 1 ? "WARMUP" : "NORMAL",
        isCompleted: false,
        isPR: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      newSets.push(setLog);
    }

    await db.setLogs.bulkPut(newSets);
    for (const s of newSets) {
      await enqueueSyncMutation("setLog", s.id, "UPSERT", s as unknown as Record<string, unknown>);
    }

    set({
      exerciseGroups: [
        ...exerciseGroups,
        {
          exercise,
          sets: newSets,
          ghostSets,
        },
      ],
    });
  },

  removeExercise: async (exerciseId: string) => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    const group = exerciseGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;

    // Delete sets from Dexie & queue deletion
    const setIds = group.sets.map((s) => s.id);
    await db.setLogs.where("id").anyOf(setIds).delete();

    for (const sid of setIds) {
      await enqueueSyncMutation("setLog", sid, "DELETE", { id: sid });
    }

    set({
      exerciseGroups: exerciseGroups.filter((g) => g.exercise.id !== exerciseId),
    });
  },

  addSet: async (exerciseId: string, setType: SetType = "NORMAL") => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    const group = exerciseGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;

    const nextSetNumber = group.sets.length + 1;
    const previousSet = group.sets[group.sets.length - 1];
    const ghost = group.ghostSets.find((g) => g.setNumber === nextSetNumber);

    const defaultWeight = previousSet ? previousSet.weight : ghost ? ghost.weight : 20;
    const defaultReps = previousSet ? previousSet.reps : ghost ? ghost.reps : 10;
    const nowIso = new Date().toISOString();

    const newSetLog: LocalSetLog = {
      id: uuidv4(),
      sessionId: session.id,
      exerciseId,
      setNumber: nextSetNumber,
      weight: defaultWeight,
      reps: defaultReps,
      rpe: 8,
      setType,
      isCompleted: false,
      isPR: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.setLogs.put(newSetLog);
    await enqueueSyncMutation("setLog", newSetLog.id, "UPSERT", newSetLog as unknown as Record<string, unknown>);

    set({
      exerciseGroups: exerciseGroups.map((g) =>
        g.exercise.id === exerciseId ? { ...g, sets: [...g.sets, newSetLog] } : g
      ),
    });
  },

  removeSet: async (exerciseId: string, setId: string) => {
    const { exerciseGroups } = get();
    const group = exerciseGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;

    await db.setLogs.delete(setId);
    await enqueueSyncMutation("setLog", setId, "DELETE", { id: setId });

    // Renumber remaining sets
    const remainingSets = group.sets
      .filter((s) => s.id !== setId)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    // Persist renumbered sets
    await db.setLogs.bulkPut(remainingSets);

    set({
      exerciseGroups: exerciseGroups.map((g) =>
        g.exercise.id === exerciseId ? { ...g, sets: remainingSets } : g
      ),
    });
  },

  updateSet: async (exerciseId: string, setId: string, updates: Partial<LocalSetLog>) => {
    const { exerciseGroups } = get();
    const nowIso = new Date().toISOString();

    let updatedSetLog: LocalSetLog | null = null;

    const newGroups = exerciseGroups.map((g) => {
      if (g.exercise.id !== exerciseId) return g;
      return {
        ...g,
        sets: g.sets.map((s) => {
          if (s.id !== setId) return s;
          const merged = { ...s, ...updates, updatedAt: nowIso };
          updatedSetLog = merged;
          return merged;
        }),
      };
    });

    if (updatedSetLog) {
      await db.setLogs.put(updatedSetLog);
      await enqueueSyncMutation("setLog", setId, "UPSERT", updatedSetLog as unknown as Record<string, unknown>);
    }

    set({ exerciseGroups: newGroups });
  },

  toggleSetCompleted: async (exerciseId: string, setId: string) => {
    const { exerciseGroups, startRestTimer } = get();
    const group = exerciseGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;

    const targetSet = group.sets.find((s) => s.id === setId);
    if (!targetSet) return;

    const nextCompleted = !targetSet.isCompleted;
    let isPR = false;

    if (nextCompleted) {
      // Check PR using Brzycki formula
      const prCheck = await checkIfPR(exerciseId, targetSet.weight, targetSet.reps, targetSet.id);
      isPR = prCheck.isPR;

      if (isPR) {
        playPRFanfare();
        toast.success(`🔥 NEW PR: ${group.exercise.name} ${targetSet.weight}kg × ${targetSet.reps}!`);
      } else {
        playTapSound();
      }

      // Trigger drift-free rest timer (default 90s)
      startRestTimer(90, group.exercise.name);
    }

    const nowIso = new Date().toISOString();
    const updatedSet: LocalSetLog = {
      ...targetSet,
      isCompleted: nextCompleted,
      isPR,
      updatedAt: nowIso,
    };

    // 1. Optimistic Zustand update
    set({
      exerciseGroups: exerciseGroups.map((g) =>
        g.exercise.id === exerciseId
          ? {
              ...g,
              sets: g.sets.map((s) => (s.id === setId ? updatedSet : s)),
            }
          : g
      ),
    });

    // 2. Persist to Dexie
    await db.setLogs.put(updatedSet);

    // 3. Enqueue to outbox sync queue
    await enqueueSyncMutation("setLog", setId, "UPSERT", updatedSet as unknown as Record<string, unknown>);
  },

  finishWorkout: async () => {
    const { session, exerciseGroups, workoutElapsedSec, stopRestTimer } = get();
    if (!session) return null;

    stopRestTimer();

    // Calculate total volume: sum of (weight * reps) for all completed sets
    let totalVolume = 0;
    for (const g of exerciseGroups) {
      for (const s of g.sets) {
        if (s.isCompleted) {
          totalVolume += s.weight * s.reps;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const completedSession: LocalWorkoutSession = {
      ...session,
      endTime: nowIso,
      durationSec: workoutElapsedSec,
      totalVolume: Math.round(totalVolume),
      status: "COMPLETED",
      updatedAt: nowIso,
    };

    // Save completed session in Dexie
    await db.workoutSessions.put(completedSession);
    await enqueueSyncMutation("workoutSession", completedSession.id, "UPSERT", completedSession as unknown as Record<string, unknown>);

    set({
      session: null,
      exerciseGroups: [],
      workoutElapsedSec: 0,
      isPaused: false,
    });

    return completedSession;
  },

  discardWorkout: async () => {
    const { session, stopRestTimer } = get();
    stopRestTimer();

    if (session) {
      // Remove all sets for this session
      const sets = await db.setLogs.where("sessionId").equals(session.id).toArray();
      const setIds = sets.map((s) => s.id);
      await db.setLogs.where("id").anyOf(setIds).delete();
      await db.workoutSessions.delete(session.id);

      for (const sid of setIds) {
        await enqueueSyncMutation("setLog", sid, "DELETE", { id: sid });
      }
      await enqueueSyncMutation("workoutSession", session.id, "DELETE", { id: session.id });
    }

    set({
      session: null,
      exerciseGroups: [],
      workoutElapsedSec: 0,
      isPaused: false,
    });
  },

  // Drift-Free Rest Timer Implementation
  startRestTimer: (durationSec: number, exerciseName?: string) => {
    const targetEndTime = Date.now() + durationSec * 1000;
    set({
      restTimer: {
        isRunning: true,
        totalDurationSec: durationSec,
        remainingSec: durationSec,
        targetEndTime,
        exerciseName: exerciseName ?? null,
      },
    });
  },

  adjustRestTimer: (deltaSec: number) => {
    const { restTimer } = get();
    if (!restTimer.isRunning || !restTimer.targetEndTime) return;

    const newTarget = Math.max(Date.now(), restTimer.targetEndTime + deltaSec * 1000);
    const newRemaining = Math.max(0, Math.round((newTarget - Date.now()) / 1000));
    const newTotal = Math.max(10, restTimer.totalDurationSec + deltaSec);

    set({
      restTimer: {
        ...restTimer,
        totalDurationSec: newTotal,
        remainingSec: newRemaining,
        targetEndTime: newTarget,
      },
    });
  },

  stopRestTimer: () => {
    set({
      restTimer: {
        isRunning: false,
        totalDurationSec: 90,
        remainingSec: 90,
        targetEndTime: null,
        exerciseName: null,
      },
    });
  },

  tickRestTimer: () => {
    const { restTimer, stopRestTimer } = get();
    if (!restTimer.isRunning || !restTimer.targetEndTime) return;

    const now = Date.now();
    const remainingMs = restTimer.targetEndTime - now;

    if (remainingMs <= 0) {
      // Timer completed! Play synthesized beep and mobile haptic vibration
      playTimerCompleteSound();
      stopRestTimer();
    } else {
      const remainingSec = Math.ceil(remainingMs / 1000);
      set({
        restTimer: {
          ...restTimer,
          remainingSec,
        },
      });
    }
  },
}));
