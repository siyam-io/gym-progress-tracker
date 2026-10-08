import { db } from "@/lib/db/dexie";

/**
 * Export complete Dexie database as a downloadable JSON string
 */
export async function exportAllDataAsJson(): Promise<string> {
  const exercises = await db.exercises.toArray();
  const routines = await db.routines.toArray();
  const routineItems = await db.routineItems.toArray();
  const workoutSessions = await db.workoutSessions.toArray();
  const setLogs = await db.setLogs.toArray();
  const bodyWeightLogs = await db.bodyWeightLogs.toArray();

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: "Pulse Gym Tracker",
    data: {
      exercises,
      routines,
      routineItems,
      workoutSessions,
      setLogs,
      bodyWeightLogs,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore Dexie database from a JSON backup file
 */
export async function importDataFromJson(
  jsonStr: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const backup = JSON.parse(jsonStr);
    if (!backup || !backup.data) {
      return { success: false, count: 0, error: "Invalid backup file structure" };
    }

    const {
      exercises,
      routines,
      routineItems,
      workoutSessions,
      setLogs,
      bodyWeightLogs,
    } = backup.data;

    let totalImported = 0;

    if (Array.isArray(exercises) && exercises.length > 0) {
      await db.exercises.bulkPut(exercises);
      totalImported += exercises.length;
    }
    if (Array.isArray(routines) && routines.length > 0) {
      await db.routines.bulkPut(routines);
      totalImported += routines.length;
    }
    if (Array.isArray(routineItems) && routineItems.length > 0) {
      await db.routineItems.bulkPut(routineItems);
      totalImported += routineItems.length;
    }
    if (Array.isArray(workoutSessions) && workoutSessions.length > 0) {
      await db.workoutSessions.bulkPut(workoutSessions);
      totalImported += workoutSessions.length;
    }
    if (Array.isArray(setLogs) && setLogs.length > 0) {
      await db.setLogs.bulkPut(setLogs);
      totalImported += setLogs.length;
    }
    if (Array.isArray(bodyWeightLogs) && bodyWeightLogs.length > 0) {
      await db.bodyWeightLogs.bulkPut(bodyWeightLogs);
      totalImported += bodyWeightLogs.length;
    }

    return { success: true, count: totalImported };
  } catch (err: unknown) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to parse backup JSON",
    };
  }
}
