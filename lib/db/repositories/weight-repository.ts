import { db } from "@/lib/db/dexie";
import { enqueueSyncMutation } from "@/lib/sync/client-sync";
import { LocalBodyWeightLog } from "@/types/workout";

/**
 * Save daily body weight entry into Dexie with outbox mutation and cloud sync
 */
export async function saveBodyWeightLog(data: {
  id?: string;
  weight: number;
  unit?: string;
  date?: string; // YYYY-MM-DD
  note?: string | null;
  userId?: string | null;
}): Promise<LocalBodyWeightLog> {
  const date = data.date || new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const existing = await db.bodyWeightLogs
    .where("date")
    .equals(date)
    .first();

  const id = existing?.id || data.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bw-${Date.now()}`);
  const record: LocalBodyWeightLog = {
    id,
    userId: data.userId ?? existing?.userId ?? null,
    weight: Math.round(Number(data.weight) * 10) / 10,
    unit: data.unit || existing?.unit || "kg",
    date,
    note: data.note !== undefined ? data.note : (existing?.note || null),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.bodyWeightLogs.put(record);
  await enqueueSyncMutation("bodyWeight", id, "UPSERT", record as unknown as Record<string, unknown>);

  // Also sync directly to /api/weight in background if online
  if (typeof window !== "undefined" && navigator.onLine) {
    void fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => {});
  }

  return record;
}

export async function getBodyWeightLogs(limit = 30): Promise<LocalBodyWeightLog[]> {
  if (typeof window === "undefined") return [];
  const logs = await db.bodyWeightLogs.toArray();
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

export async function getLatestBodyWeightLog(): Promise<LocalBodyWeightLog | null> {
  if (typeof window === "undefined") return null;
  const logs = await db.bodyWeightLogs.toArray();
  if (logs.length === 0) return null;
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export async function deleteBodyWeightLog(id: string): Promise<void> {
  await db.bodyWeightLogs.delete(id);
  await enqueueSyncMutation("bodyWeight", id, "DELETE", { id });

  if (typeof window !== "undefined" && navigator.onLine) {
    void fetch(`/api/weight?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

export async function getBodyWeightStats(): Promise<{
  latestWeight: number | null;
  latestDate: string | null;
  weeklyDelta: number | null;
  history: LocalBodyWeightLog[];
}> {
  if (typeof window === "undefined") {
    return { latestWeight: null, latestDate: null, weeklyDelta: null, history: [] };
  }

  const logs = await getBodyWeightLogs(30);
  if (logs.length === 0) {
    return { latestWeight: null, latestDate: null, weeklyDelta: null, history: [] };
  }

  const latest = logs[0];
  let weeklyDelta: number | null = null;

  // Find entry from ~7 days ago
  const latestTime = new Date(latest.date).getTime();
  const sevenDaysAgo = latestTime - 7 * 86400000;

  // Find the closest log within 5-9 days ago
  const weekOldLog = logs.find((l) => {
    const t = new Date(l.date).getTime();
    return Math.abs(t - sevenDaysAgo) <= 2 * 86400000;
  });

  if (weekOldLog) {
    weeklyDelta = Math.round((latest.weight - weekOldLog.weight) * 10) / 10;
  } else if (logs.length > 1) {
    const oldestInSample = logs[logs.length - 1];
    weeklyDelta = Math.round((latest.weight - oldestInSample.weight) * 10) / 10;
  }

  return {
    latestWeight: latest.weight,
    latestDate: latest.date,
    weeklyDelta,
    history: logs,
  };
}
