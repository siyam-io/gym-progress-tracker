import { db, initializeLocalDb } from "@/lib/db/dexie";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escapes values for CSV compatibility
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports all completed workout sessions and their sets to CSV format
 */
export async function exportWorkoutsToCsv(): Promise<void> {
  await initializeLocalDb();

  const [sessions, sets, exercises] = await Promise.all([
    db.workoutSessions.where("status").equals("COMPLETED").toArray(),
    db.setLogs.filter((s) => s.isCompleted).toArray(),
    db.exercises.toArray(),
  ]);

  const exMap = new Map(exercises.map((e) => [e.id, e.name]));
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const headers = [
    "Date",
    "Workout Title",
    "Duration (Min)",
    "Exercise",
    "Set Number",
    "Weight (kg)",
    "Reps",
    "RPE",
    "Set Type",
    "Personal Record",
  ];

  const rows: string[] = [headers.join(",")];

  // Sort sets by creation date ascending
  sets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const set of sets) {
    const session = sessionMap.get(set.sessionId);
    const dateStr = session ? session.startTime.slice(0, 10) : set.createdAt.slice(0, 10);
    const sessionTitle = session?.title || "Workout";
    const durationMin = session ? Math.round(session.durationSec / 60) : "";
    const exerciseName = exMap.get(set.exerciseId) || "Exercise";

    const row = [
      escapeCsv(dateStr),
      escapeCsv(sessionTitle),
      escapeCsv(durationMin),
      escapeCsv(exerciseName),
      escapeCsv(set.setNumber),
      escapeCsv(set.weight),
      escapeCsv(set.reps),
      escapeCsv(set.rpe ?? ""),
      escapeCsv(set.setType),
      escapeCsv(set.isPR ? "YES" : "NO"),
    ];

    rows.push(row.join(","));
  }

  const csvContent = rows.join("\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `pulse-workouts-${dateStr}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Exports all logged body weights to CSV format
 */
export async function exportBodyWeightToCsv(): Promise<void> {
  await initializeLocalDb();

  const logs = await db.bodyWeightLogs.orderBy("date").toArray();

  const headers = ["Date", "Weight", "Unit", "Note", "Logged At"];
  const rows: string[] = [headers.join(",")];

  for (const log of logs) {
    const row = [
      escapeCsv(log.date),
      escapeCsv(log.weight),
      escapeCsv(log.unit || "kg"),
      escapeCsv(log.note || ""),
      escapeCsv(log.createdAt),
    ];
    rows.push(row.join(","));
  }

  const csvContent = rows.join("\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `pulse-bodyweight-${dateStr}.csv`, "text/csv;charset=utf-8;");
}
