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
  isCardioExercise,
  isBodyweightExercise,
  getLatestBodyWeightLog,
} from "@/lib/db/dexie";
import { checkIfPR } from "@/lib/utils/pr-calculator";
import { playPRFanfare, playTimerCompleteSound, playTapSound } from "@/lib/utils/audio-feedback";

export interface ExerciseGroup {
  exercise: LocalExercise;
  sets: LocalSetLog[];
  ghostSets: Array<{ setNumber: number; weight: number; reps: number; rpe?: number | null }>;
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
  pausedAtMs: number | null;
  totalPausedMs: number;
  isLoading: boolean;
  currentUserId: string | null;
  userBodyWeight: number | null;

  // Drift-Free Rest Timer State
  restTimer: RestTimerState;

  // Actions - Session
  setCurrentUserId: (userId: string | null) => void;
  fetchUserBodyWeight: () => Promise<number>;
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
  moveExercise: (exerciseId: string, direction: "up" | "down") => Promise<void>;
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
  pausedAtMs: null,
  totalPausedMs: 0,
  isLoading: true,
  currentUserId: null,
  userBodyWeight: null,

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  fetchUserBodyWeight: async () => {
    try {
      const latest = await getLatestBodyWeightLog();
      const bw = latest?.weight ?? 58.3;
      set({ userBodyWeight: bw });
      return bw;
    } catch {
      const bw = 58.3;
      set({ userBodyWeight: bw });
      return bw;
    }
  },

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

      // Load user's latest logged body weight in background
      void getLatestBodyWeightLog().then((latest) => {
        if (latest?.weight) {
          set({ userBodyWeight: latest.weight });
        }
      }).catch(() => {});

      // If session is ALREADY active in memory, do NOT overwrite it
      const current = get();
      if (current.session && current.session.status === "IN_PROGRESS") {
        const startTimeMs = new Date(current.session.startTime).getTime();
        const nowMs = Date.now();
        const elapsed = (isNaN(startTimeMs) || startTimeMs > nowMs)
          ? 0
          : Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
        set({ workoutElapsedSec: elapsed, isLoading: false });
        return;
      }

      // Look for in-progress sessions in Dexie
      const inProgressSessions = await db.workoutSessions
        .where("status")
        .equals("IN_PROGRESS")
        .toArray();

      if (inProgressSessions.length === 0) {
        set({ isLoading: false });
        return;
      }

      // Sort by startTime descending to pick the newest session
      inProgressSessions.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      const inProgressSession = inProgressSessions[0];

      // Clean up any extra stale in-progress sessions if there were multiple
      if (inProgressSessions.length > 1) {
        for (let i = 1; i < inProgressSessions.length; i++) {
          const extra = inProgressSessions[i];
          await db.workoutSessions.delete(extra.id);
          await db.setLogs.where("sessionId").equals(extra.id).delete();
        }
      }

      // Check if session is older than 18 hours (abandoned zombie session)
      const startTimeMs = new Date(inProgressSession.startTime).getTime();
      const nowMs = Date.now();
      const STALE_WORKOUT_MAX_AGE_MS = 18 * 60 * 60 * 1000; // 18 hours

      if (isNaN(startTimeMs) || nowMs - startTimeMs > STALE_WORKOUT_MAX_AGE_MS) {
        console.warn("[WorkoutStore] Discarding stale in-progress session older than 18h:", inProgressSession.id);
        await db.workoutSessions.delete(inProgressSession.id);
        await db.setLogs.where("sessionId").equals(inProgressSession.id).delete();
        set({ session: null, exerciseGroups: [], workoutElapsedSec: 0, isLoading: false });
        return;
      }

      // Load all sets for this session
      const sets = await db.setLogs.where("sessionId").equals(inProgressSession.id).toArray();

      // Track earliest set createdAt per exercise
      const exerciseEarliestCreated = new Map<string, string>();
      for (const s of sets) {
        const cur = exerciseEarliestCreated.get(s.exerciseId);
        if (!cur || s.createdAt < cur) {
          exerciseEarliestCreated.set(s.exerciseId, s.createdAt);
        }
      }

      // Determine deterministic, correct serial ordering of exercises
      let orderedExerciseIds: string[] = [];
      if (inProgressSession.routineId) {
        const routineItems = await db.routineItems
          .where("routineId")
          .equals(inProgressSession.routineId)
          .sortBy("orderIndex");
        const routineExIds = routineItems.map((r) => r.exerciseId);

        const sessionExSet = new Set(sets.map((s) => s.exerciseId));
        const routinePreserved = routineExIds.filter((id) => sessionExSet.has(id));
        const extraExercises = Array.from(sessionExSet)
          .filter((id) => !routineExIds.includes(id))
          .sort((a, b) =>
            (exerciseEarliestCreated.get(a) || "").localeCompare(exerciseEarliestCreated.get(b) || "")
          );

        orderedExerciseIds = [...routinePreserved, ...extraExercises];
      } else {
        orderedExerciseIds = Array.from(new Set(sets.map((s) => s.exerciseId))).sort((a, b) =>
          (exerciseEarliestCreated.get(a) || "").localeCompare(exerciseEarliestCreated.get(b) || "")
        );
      }

      const exercises = await db.exercises.where("id").anyOf(orderedExerciseIds).toArray();
      const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

      // Group sets by exercise in the exact ordered sequence
      const groups: ExerciseGroup[] = [];
      for (const exId of orderedExerciseIds) {
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
      const elapsed = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));

      set({
        session: inProgressSession,
        exerciseGroups: groups,
        workoutElapsedSec: elapsed,
        isPaused: false,
        pausedAtMs: null,
        totalPausedMs: 0,
        isLoading: false,
      });
    } catch (err) {
      console.error("[WorkoutStore] Failed to restore session:", err);
      set({ isLoading: false });
    }
  },

  startWorkout: async (title = "Gym Workout", initialExercises = [], routineId) => {
    // 1. Clean up any existing abandoned IN_PROGRESS sessions from Dexie to avoid zombie session conflicts
    const staleSessions = await db.workoutSessions
      .where("status")
      .equals("IN_PROGRESS")
      .toArray();

    for (const stale of staleSessions) {
      await db.workoutSessions.delete(stale.id);
      await db.setLogs.where("sessionId").equals(stale.id).delete();
    }

    let userBw = get().userBodyWeight;
    if (!userBw) {
      try {
        const latest = await getLatestBodyWeightLog();
        userBw = latest?.weight ?? 58.3;
      } catch {
        userBw = 58.3;
      }
      set({ userBodyWeight: userBw });
    }

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
    const baseTimeMs = Date.now();

    // Ensure initial exercises are unique by id to prevent duplicate sets
    const seenInitialEx = new Set<string>();
    const uniqueInitialExercises = initialExercises.filter((ex) => {
      if (seenInitialEx.has(ex.id)) return false;
      seenInitialEx.add(ex.id);
      return true;
    });

    // If initial exercises provided, populate with default sets (1 set for cardio, 3 for lifting/bodyweight)
    for (let exIdx = 0; exIdx < uniqueInitialExercises.length; exIdx++) {
      const ex = uniqueInitialExercises[exIdx];
      const isCardio = isCardioExercise(ex);
      const isBodyweight = isBodyweightExercise(ex);

      const targetSetsCount = isCardio ? 1 : 3;
      const ghostSets = await getPreviousExerciseSets(ex.id);
      const defaultSets: LocalSetLog[] = [];
      const exCreatedAt = new Date(baseTimeMs + exIdx * 100).toISOString();

      for (let i = 1; i <= targetSetsCount; i++) {
        const ghost = ghostSets.find((g) => g.setNumber === i);
        const defaultWeight = isCardio
          ? (ghost ? ghost.weight : 1.0)
          : isBodyweight
          ? (ghost ? ghost.weight : (userBw || 58.3))
          : (ghost ? ghost.weight : 20);

        const setLog: LocalSetLog = {
          id: uuidv4(),
          sessionId,
          exerciseId: ex.id,
          setNumber: i,
          weight: defaultWeight,
          reps: isCardio ? (ghost ? ghost.reps : 10) : (ghost ? ghost.reps : 10),
          rpe: isCardio ? (ghost?.rpe ?? 5) : 8,
          setType: "NORMAL",
          isCompleted: false,
          isPR: false,
          createdAt: exCreatedAt,
          updatedAt: exCreatedAt,
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
      pausedAtMs: null,
      totalPausedMs: 0,
    });
  },

  pauseWorkout: () => {
    if (get().isPaused) return;
    set({ isPaused: true, pausedAtMs: Date.now() });
  },
  resumeWorkout: () => {
    const { isPaused, pausedAtMs, totalPausedMs } = get();
    if (!isPaused) return;
    const now = Date.now();
    const additional = pausedAtMs ? Math.max(0, now - pausedAtMs) : 0;
    set({
      isPaused: false,
      pausedAtMs: null,
      totalPausedMs: totalPausedMs + additional,
    });
  },
  incrementWorkoutElapsed: () => {
    const { isPaused, session, totalPausedMs } = get();
    if (isPaused || !session?.startTime) return;
    const startTimeMs = new Date(session.startTime).getTime();
    const nowMs = Date.now();
    const elapsed = (isNaN(startTimeMs) || startTimeMs > nowMs)
      ? 0
      : Math.max(0, Math.floor((nowMs - startTimeMs - totalPausedMs) / 1000));
    set({ workoutElapsedSec: elapsed });
  },

  addExercise: async (exercise: LocalExercise) => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    // Avoid duplicates
    if (exerciseGroups.some((g) => g.exercise.id === exercise.id)) return;

    const isCardio = isCardioExercise(exercise);
    const isBodyweight = isBodyweightExercise(exercise);
    const userBw = get().userBodyWeight || 58.3;
    const targetSetsCount = isCardio ? 1 : 3;
    const ghostSets = await getPreviousExerciseSets(exercise.id);
    const nowIso = new Date().toISOString();

    const newSets: LocalSetLog[] = [];
    for (let i = 1; i <= targetSetsCount; i++) {
      const ghost = ghostSets.find((g) => g.setNumber === i);
      const defaultWeight = isCardio
        ? (ghost ? ghost.weight : 1.0)
        : isBodyweight
        ? (ghost ? ghost.weight : userBw)
        : (ghost ? ghost.weight : 20);

      const setLog: LocalSetLog = {
        id: uuidv4(),
        sessionId: session.id,
        exerciseId: exercise.id,
        setNumber: i,
        weight: defaultWeight,
        reps: isCardio ? (ghost ? ghost.reps : 10) : (ghost ? ghost.reps : 10),
        rpe: isCardio ? (ghost?.rpe ?? 5) : 8,
        setType: "NORMAL",
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

  moveExercise: async (exerciseId: string, direction: "up" | "down") => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    const index = exerciseGroups.findIndex((g) => g.exercise.id === exerciseId);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exerciseGroups.length) return;

    const updated = [...exerciseGroups];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    set({ exerciseGroups: updated });

    try {
      const baseTimeMs = new Date(session.startTime).getTime();
      for (let gIdx = 0; gIdx < updated.length; gIdx++) {
        const g = updated[gIdx];
        for (let sIdx = 0; sIdx < g.sets.length; sIdx++) {
          const s = g.sets[sIdx];
          const setIso = new Date(baseTimeMs + gIdx * 60000 + sIdx * 1000).toISOString();
          s.createdAt = setIso;
          s.updatedAt = setIso;
          await db.setLogs.update(s.id, { createdAt: setIso, updatedAt: setIso });
        }
      }
    } catch (err) {
      console.error("[WorkoutStore] Failed to persist exercise order:", err);
    }
  },

  addSet: async (exerciseId: string, setType: SetType = "NORMAL") => {
    const { session, exerciseGroups } = get();
    if (!session) return;

    const group = exerciseGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;

    const isCardio = isCardioExercise(group.exercise);
    const isBodyweight = isBodyweightExercise(group.exercise);
    const userBw = get().userBodyWeight || 58.3;
    const nextSetNumber = group.sets.length + 1;
    const previousSet = group.sets[group.sets.length - 1];
    const ghost = group.ghostSets.find((g) => g.setNumber === nextSetNumber);

    const defaultWeight = previousSet
      ? previousSet.weight
      : ghost
      ? ghost.weight
      : isCardio
      ? 1.0
      : isBodyweight
      ? userBw
      : 20;
    const defaultReps = previousSet ? previousSet.reps : ghost ? ghost.reps : 10;
    const defaultRpe = previousSet?.rpe ?? (ghost?.rpe ?? (isCardio ? 5 : 8));
    const nowIso = new Date().toISOString();

    const newSetLog: LocalSetLog = {
      id: uuidv4(),
      sessionId: session.id,
      exerciseId,
      setNumber: nextSetNumber,
      weight: defaultWeight,
      reps: defaultReps,
      rpe: defaultRpe,
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
