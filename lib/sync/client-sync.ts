import { db } from "@/lib/db/dexie";
import { deduplicateDatabaseRecords } from "@/lib/db/deduplication";
import {
  OutboxSyncItem,
  SyncEntityType,
  SyncAction,
  SyncResult,
} from "@/types/sync";
import {
  LocalRoutineItem,
  LocalSetLog,
  LocalBodyWeightLog,
} from "@/types/workout";

/**
 * Enqueue a mutation into IndexedDB outbox_sync_queue
 */
export async function enqueueSyncMutation(
  entityType: SyncEntityType,
  entityId: string,
  action: SyncAction,
  payload: Record<string, unknown>
): Promise<void> {
  const syncItem: OutboxSyncItem = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random()}`,
    entityType,
    entityId,
    action,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "PENDING",
  };

  await db.outbox_sync_queue.put(syncItem);

  if (typeof window !== "undefined" && navigator.onLine) {
    void processSyncQueue();
  }
}

let isSyncing = false;

/**
 * Process the outbox sync queue and send batch to /api/workouts/sync
 */
export async function processSyncQueue(): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine || isSyncing) {
    return { success: false, processedCount: 0 };
  }

  isSyncing = true;
  try {
    const pendingItems = await db.outbox_sync_queue
      .where("status")
      .equals("PENDING")
      .limit(50)
      .toArray();

    if (pendingItems.length === 0) {
      isSyncing = false;
      return { success: true, processedCount: 0 };
    }

    const itemIds = pendingItems.map((i) => i.id);
    await db.outbox_sync_queue.where("id").anyOf(itemIds).modify({ status: "SYNCING" });

    const response = await fetch("/api/workouts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: pendingItems }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await db.outbox_sync_queue.where("id").anyOf(itemIds).modify((item) => {
        item.status = "FAILED";
        item.retryCount += 1;
        item.lastError = errText;
      });
      isSyncing = false;
      return { success: false, processedCount: 0, errors: errText };
    }

    const result = await response.json();
    const syncedIds: string[] = result.syncedIds || itemIds;

    await db.outbox_sync_queue.where("id").anyOf(syncedIds).delete();

    isSyncing = false;
    return { success: true, processedCount: syncedIds.length };
  } catch (err: unknown) {
    console.error("[Dexie Sync Engine] Sync batch failed:", err);
    isSyncing = false;
    return { success: false, processedCount: 0, errors: err };
  }
}

// Automatically flush pending failed items when connection is restored
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[Dexie Sync Engine] Device online. Flushing outbox...");
    void db.outbox_sync_queue
      .where("status")
      .equals("FAILED")
      .modify({ status: "PENDING" })
      .then(() => fullBiDirectionalSync());
  });
}

/**
 * Pull cloud user data from /api/workouts/sync into local Dexie IndexedDB
 */
export async function pullSyncFromServer(): Promise<{
  success: boolean;
  pulledSessions: number;
  pulledRoutines: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { success: false, pulledSessions: 0, pulledRoutines: 0 };
  }

  try {
    const res = await fetch("/api/workouts/sync", {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    if (res.status === 401) {
      // User is not logged in on cloud, skip pull
      return { success: false, pulledSessions: 0, pulledRoutines: 0 };
    }

    if (!res.ok) {
      console.warn("[Dexie Sync] Pull failed with status:", res.status);
      return { success: false, pulledSessions: 0, pulledRoutines: 0 };
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, pulledSessions: 0, pulledRoutines: 0 };
    }

    const { sessions, routines, customExercises, bodyWeights } = data;

    // 1. Merge custom exercises
    if (Array.isArray(customExercises) && customExercises.length > 0) {
      await db.exercises.bulkPut(customExercises);
    }

    // 2. Merge routines & routine items (with deduplication)
    let pulledRoutinesCount = 0;
    if (Array.isArray(routines)) {
      for (const r of routines) {
        await db.routines.put({
          id: r.id,
          name: r.name,
          userId: r.userId || null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        });

        if (Array.isArray(r.items)) {
          await db.routineItems.where("routineId").equals(r.id).delete();

          const seenEx = new Set<string>();
          const cleanItems: LocalRoutineItem[] = [];
          for (const item of r.items) {
            if (!seenEx.has(item.exerciseId)) {
              seenEx.add(item.exerciseId);
              cleanItems.push({
                id: item.id || `ri-${r.id}-${cleanItems.length}`,
                routineId: r.id,
                exerciseId: item.exerciseId,
                orderIndex: cleanItems.length + 1,
                targetSets: item.targetSets || 3,
                restSeconds: item.restSeconds || 90,
              });
            }
          }
          await db.routineItems.bulkPut(cleanItems);
        }
        pulledRoutinesCount++;
      }
    }

    // 3. Merge sessions and sets (with deduplication)
    let pulledSessionsCount = 0;
    if (Array.isArray(sessions)) {
      for (const s of sessions) {
        await db.workoutSessions.put({
          id: s.id,
          userId: s.userId || null,
          routineId: s.routineId || null,
          title: s.title,
          startTime: new Date(s.startTime).toISOString(),
          endTime: s.endTime ? new Date(s.endTime).toISOString() : null,
          durationSec: s.durationSec || 0,
          totalVolume: s.totalVolume || 0,
          status: s.status || "COMPLETED",
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
        });

        if (Array.isArray(s.sets)) {
          const seenKey = new Set<string>();
          const cleanSets: LocalSetLog[] = [];
          for (const st of s.sets) {
            const key = `${st.exerciseId}-${st.setNumber}`;
            if (!seenKey.has(key)) {
              seenKey.add(key);
              cleanSets.push({
                id: st.id,
                sessionId: s.id,
                exerciseId: st.exerciseId,
                setNumber: st.setNumber,
                weight: st.weight,
                reps: st.reps,
                rpe: st.rpe ?? null,
                setType: st.setType || "NORMAL",
                isCompleted: Boolean(st.isCompleted),
                isPR: Boolean(st.isPR),
                createdAt: st.createdAt ? new Date(st.createdAt).toISOString() : new Date().toISOString(),
                updatedAt: st.updatedAt ? new Date(st.updatedAt).toISOString() : new Date().toISOString(),
              });
            }
          }
          await db.setLogs.bulkPut(cleanSets);
        }
        pulledSessionsCount++;
      }
    }

    // 4. Merge body weights
    if (Array.isArray(bodyWeights) && bodyWeights.length > 0) {
      const cleanWeights: LocalBodyWeightLog[] = bodyWeights.map((bw: {
        id: string;
        userId?: string | null;
        weight: number;
        unit?: string;
        date: string;
        note?: string | null;
        createdAt?: string;
        updatedAt?: string;
      }) => ({
        id: bw.id,
        userId: bw.userId || null,
        weight: bw.weight,
        unit: bw.unit || "kg",
        date: bw.date,
        note: bw.note || null,
        createdAt: bw.createdAt ? new Date(bw.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: bw.updatedAt ? new Date(bw.updatedAt).toISOString() : new Date().toISOString(),
      }));
      await db.bodyWeightLogs.bulkPut(cleanWeights);
    }

    return {
      success: true,
      pulledSessions: pulledSessionsCount,
      pulledRoutines: pulledRoutinesCount,
    };
  } catch (err) {
    console.error("[Dexie Sync] Error pulling from server:", err);
    return { success: false, pulledSessions: 0, pulledRoutines: 0 };
  }
}

/**
 * Assign authenticated userId to existing local offline records and queue sync
 */
export async function claimLocalDataForUser(userId: string): Promise<void> {
  if (!userId || typeof window === "undefined") return;

  try {
    // 1. Claim sessions
    const unownedSessions = await db.workoutSessions.filter((s) => !s.userId || s.userId !== userId).toArray();
    for (const s of unownedSessions) {
      const updated = { ...s, userId };
      await db.workoutSessions.put(updated);
      await enqueueSyncMutation("workoutSession", s.id, "UPSERT", updated as unknown as Record<string, unknown>);
    }

    // 2. Claim routines
    const unownedRoutines = await db.routines.filter((r) => !r.userId || r.userId !== userId).toArray();
    for (const r of unownedRoutines) {
      const items = await db.routineItems.where("routineId").equals(r.id).toArray();
      const updated = { ...r, userId };
      await db.routines.put(updated);
      await enqueueSyncMutation("routine", r.id, "UPSERT", { ...updated, items } as unknown as Record<string, unknown>);
    }

    // 3. Claim body weights
    const unownedWeights = await db.bodyWeightLogs.filter((w) => !w.userId || w.userId !== userId).toArray();
    for (const w of unownedWeights) {
      const updated = { ...w, userId };
      await db.bodyWeightLogs.put(updated);
      await enqueueSyncMutation("bodyWeight", w.id, "UPSERT", updated as unknown as Record<string, unknown>);
    }
  } catch (err) {
    console.error("[Dexie Sync] Error claiming local data for user:", err);
  }
}

/**
 * Perform a full bi-directional sync (claim data + push outbox + pull remote data + deduplicate)
 */
export async function fullBiDirectionalSync(userId?: string): Promise<{
  success: boolean;
  pushedCount: number;
  pulledSessions: number;
  pulledRoutines: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { success: false, pushedCount: 0, pulledSessions: 0, pulledRoutines: 0 };
  }

  try {
    if (userId) {
      await claimLocalDataForUser(userId);
    }

    // 1. Push pending local mutations to cloud
    const pushResult = await processSyncQueue();

    // 2. Pull remote records from cloud
    const pullResult = await pullSyncFromServer();

    // 3. Deduplicate in case of duplicate records
    await deduplicateDatabaseRecords();

    return {
      success: true,
      pushedCount: pushResult.processedCount || 0,
      pulledSessions: pullResult.pulledSessions || 0,
      pulledRoutines: pullResult.pulledRoutines || 0,
    };
  } catch (err) {
    console.error("[Dexie Sync] Error in full bi-directional sync:", err);
    return { success: false, pushedCount: 0, pulledSessions: 0, pulledRoutines: 0 };
  }
}
