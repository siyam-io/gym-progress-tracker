/**
 * Utility functions for local date formatting and duration display.
 * Avoids UTC timezone conversion bugs where `toISOString().slice(0, 10)`
 * shifts dates backward or forward relative to the user's actual local calendar day.
 */

export function formatLocalDate(date: Date | string | number = new Date()): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, "0");
    const day = String(fallback.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
