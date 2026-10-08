import { db } from "@/lib/db/dexie";
import { enqueueSyncMutation } from "@/lib/sync/client-sync";
import { DEFAULT_EXERCISES } from "@/lib/db/seeds/exercises";
import {
  LocalExercise,
  ExerciseCategory,
  LocalSetLog,
  LocalWorkoutSession,
  ExerciseHistorySession,
  ExerciseDetailHistory,
} from "@/types/workout";

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

/**
 * Update an existing exercise (name, category, muscles)
 */
export async function updateExercise(
  exerciseId: string,
  updates: Partial<Omit<LocalExercise, "id">>
): Promise<LocalExercise | null> {
  const existing = await db.exercises.get(exerciseId);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const updated: LocalExercise = {
    ...existing,
    ...updates,
    updatedAt: nowIso,
  };

  await db.exercises.put(updated);
  await enqueueSyncMutation("exercise", exerciseId, "UPSERT", updated as unknown as Record<string, unknown>);
  return updated;
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
    console.error("[Dexie Exercise Repo] Error in getExerciseDetailHistory:", err);
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
