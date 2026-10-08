import { db } from "@/lib/db/dexie";
import { enqueueSyncMutation, processSyncQueue, pullSyncFromServer } from "@/lib/sync/client-sync";
import { v4 as uuidv4 } from "uuid";
import {
  LocalWorkoutSession,
  LocalSetLog,
  LocalExercise,
  StreakDay,
  EditSessionInput,
  SessionDetailData,
  isCardioExercise,
} from "@/types/workout";

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
 * Fetch ghost placeholder data for an exercise from previous sessions
 */
export async function getPreviousExerciseSets(
  exerciseId: string
): Promise<Array<{ setNumber: number; weight: number; reps: number; rpe?: number | null }>> {
  if (typeof window === "undefined") return [];

  // Query completed workout sessions in reverse chronological order
  const completedSessions = await db.workoutSessions
    .where("status")
    .equals("COMPLETED")
    .reverse()
    .sortBy("startTime");

  for (const sess of completedSessions) {
    const sessionSets = await db.setLogs
      .where("sessionId")
      .equals(sess.id)
      .filter((s) => s.exerciseId === exerciseId && s.isCompleted)
      .toArray();

    if (sessionSets.length > 0) {
      return sessionSets
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => ({
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe ?? null,
        }));
    }
  }

  return [];
}

/**
 * Edit a previous workout session, its sets, and exercises with cloud sync
 */
export async function updateWorkoutSessionWithSets(
  input: EditSessionInput
): Promise<LocalWorkoutSession> {
  const existingSession = await db.workoutSessions.get(input.id);
  if (!existingSession) throw new Error("Workout session not found");

  const nowIso = new Date().toISOString();
  const baseTimeMs = new Date(input.startTime || nowIso).getTime();

  // 1. Fetch old sets
  const oldSets = await db.setLogs.where("sessionId").equals(input.id).toArray();
  const oldSetIds = oldSets.map((s) => s.id);

  // Track exercise order appearance in input sets to preserve exact sequential layout
  const exerciseOrderMap = new Map<string, number>();
  let orderCounter = 0;
  for (const s of input.sets) {
    if (!exerciseOrderMap.has(s.exerciseId)) {
      exerciseOrderMap.set(s.exerciseId, orderCounter++);
    }
  }

  // 2. Calculate volume from completed sets & build new set logs
  let totalVolume = 0;
  const newSets: LocalSetLog[] = [];

  for (const s of input.sets) {
    const setId = s.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `set-${Date.now()}-${Math.random()}`);
    if (s.isCompleted) {
      totalVolume += s.weight * s.reps;
    }

    const exOrder = exerciseOrderMap.get(s.exerciseId) ?? 0;
    const setTimeIso = new Date(baseTimeMs + exOrder * 60000 + s.setNumber * 1000).toISOString();

    const setLog: LocalSetLog = {
      id: setId,
      sessionId: input.id,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe !== undefined ? s.rpe : null,
      setType: s.setType,
      isCompleted: s.isCompleted,
      isPR: false,
      createdAt: setTimeIso,
      updatedAt: setTimeIso,
    };
    newSets.push(setLog);
  }

  // 3. Clear old sets and put new sets into Dexie
  await db.setLogs.where("id").anyOf(oldSetIds).delete();
  if (newSets.length > 0) {
    await db.setLogs.bulkPut(newSets);
  }

  // 4. Update session in Dexie
  const updatedSession: LocalWorkoutSession = {
    ...existingSession,
    title: input.title.trim(),
    startTime: input.startTime,
    durationSec: input.durationSec,
    totalVolume: Math.round(totalVolume),
    updatedAt: nowIso,
  };

  await db.workoutSessions.put(updatedSession);

  // 5. Enqueue sync mutations for cloud
  const newSetIds = new Set(newSets.map((s) => s.id));
  for (const oldId of oldSetIds) {
    if (!newSetIds.has(oldId)) {
      await enqueueSyncMutation("setLog", oldId, "DELETE", { id: oldId });
    }
  }

  for (const ns of newSets) {
    await enqueueSyncMutation("setLog", ns.id, "UPSERT", ns as unknown as Record<string, unknown>);
  }

  await enqueueSyncMutation(
    "workoutSession",
    updatedSession.id,
    "UPSERT",
    updatedSession as unknown as Record<string, unknown>
  );

  // Trigger sync queue flush if online
  if (typeof window !== "undefined" && navigator.onLine) {
    void processSyncQueue();
  }

  return updatedSession;
}

/**
 * Delete a workout session and all associated sets from Dexie & cloud outbox
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

  // Automatically flush sync queue if online
  if (typeof window !== "undefined" && navigator.onLine) {
    void processSyncQueue();
  }
}

/**
 * Fetch full session detail with exercises and sets for inspector
 */
export async function getSessionDetail(
  sessionId: string
): Promise<SessionDetailData | null> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return null;

  let sets = await db.setLogs.where("sessionId").equals(sessionId).toArray();
  sets.sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() ||
      a.setNumber - b.setNumber
  );

  // If local sets are empty, try cloud pull or routine auto-healing
  if (sets.length === 0) {
    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        await pullSyncFromServer();
        sets = await db.setLogs.where("sessionId").equals(sessionId).toArray();
        sets.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() ||
            a.setNumber - b.setNumber
        );
      } catch (e) {
        console.warn("[getSessionDetail] Cloud pull attempt failed:", e);
      }
    }

    // If still empty and session has a routineId, auto-heal sets from routine template
    if (sets.length === 0 && session.routineId) {
      try {
        const routineItems = await db.routineItems
          .where("routineId")
          .equals(session.routineId)
          .sortBy("orderIndex");

        if (routineItems.length > 0) {
          const routineExIds = routineItems.map((r) => r.exerciseId);
          const rExercises = await db.exercises.where("id").anyOf(routineExIds).toArray();
          const rExMap = new Map(rExercises.map((e) => [e.id, e]));

          const generatedSets: LocalSetLog[] = [];
          const nowIso = new Date().toISOString();

          for (const rItem of routineItems) {
            const ex = rExMap.get(rItem.exerciseId);
            if (!ex) continue;
            const isCardio = isCardioExercise(ex);
            const numSets = rItem.targetSets || (isCardio ? 1 : 3);

            for (let sNum = 1; sNum <= numSets; sNum++) {
              const newSet: LocalSetLog = {
                id: uuidv4(),
                sessionId: session.id,
                exerciseId: ex.id,
                setNumber: sNum,
                weight: isCardio ? 1.0 : 20,
                reps: 10,
                rpe: isCardio ? 5 : 8,
                setType: "NORMAL",
                isCompleted: true,
                isPR: false,
                createdAt: nowIso,
                updatedAt: nowIso,
              };
              generatedSets.push(newSet);
            }
          }

          if (generatedSets.length > 0) {
            await db.setLogs.bulkPut(generatedSets);
            for (const gs of generatedSets) {
              await enqueueSyncMutation("setLog", gs.id, "UPSERT", gs as unknown as Record<string, unknown>);
            }
            sets = generatedSets;
          }
        }
      } catch (err) {
        console.error("[getSessionDetail] Routine auto-healing error:", err);
      }
    }
  }

  const exerciseIds = Array.from(new Set(sets.map((s) => s.exerciseId)));

  // If session is linked to a routine, preserve the routine's orderIndex
  if (session.routineId) {
    try {
      const routineItems = await db.routineItems
        .where("routineId")
        .equals(session.routineId)
        .sortBy("orderIndex");
      if (routineItems.length > 0) {
        const orderMap = new Map(routineItems.map((r) => [r.exerciseId, r.orderIndex]));
        exerciseIds.sort((a, b) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));
      }
    } catch {
      // Fallback to insertion order
    }
  }

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

    const exSets = sets
      .filter((s) => s.exerciseId === exId)
      .sort((a, b) => a.setNumber - b.setNumber);

    groups.push({ exercise, sets: exSets });
  }

  return { session, exerciseGroups: groups };
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
