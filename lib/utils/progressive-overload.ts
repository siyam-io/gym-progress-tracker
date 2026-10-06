import { calculate1RM } from "./pr-calculator";
import { LocalSetLog } from "@/lib/db/dexie";

export type OverloadStatus = "PROGRESSING" | "PLATEAU" | "DELOAD" | "NEW";

export interface ProgressiveOverloadAnalysis {
  status: OverloadStatus;
  headline: string;
  recommendation: string;
  percentChange?: number;
  recentVolume?: number;
  previousVolume?: number;
}

interface SessionGroup {
  sessionId: string;
  dateStr: string;
  sets: LocalSetLog[];
  volume: number;
  max1RM: number;
}

/**
 * Analyzes exercise history across recent workout sessions to evaluate progressive overload
 */
export function analyzeProgressiveOverload(sets: LocalSetLog[]): ProgressiveOverloadAnalysis {
  const completed = sets.filter((s) => s.isCompleted);
  if (completed.length === 0) {
    return {
      status: "NEW",
      headline: "First Session Coming Up",
      recommendation: "Log your first working set to establish your baseline 1RM.",
    };
  }

  // Group completed sets by sessionId
  const sessionMap = new Map<string, LocalSetLog[]>();
  for (const s of completed) {
    const arr = sessionMap.get(s.sessionId) || [];
    arr.push(s);
    sessionMap.set(s.sessionId, arr);
  }

  const sessions: SessionGroup[] = [];
  for (const [sessionId, sessionSets] of sessionMap.entries()) {
    sessionSets.sort((a, b) => a.setNumber - b.setNumber);
    const volume = sessionSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const max1RM = Math.max(...sessionSets.map((s) => calculate1RM(s.weight, s.reps)));
    const dateStr = sessionSets[0]?.createdAt || "";
    sessions.push({ sessionId, dateStr, sets: sessionSets, volume, max1RM });
  }

  // Sort sessions chronological ascending
  sessions.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

  if (sessions.length < 2) {
    const single = sessions[0];
    return {
      status: "NEW",
      headline: "Baseline Established",
      recommendation: `Logged ${single.volume}kg volume with ${single.max1RM}kg estimated 1RM. Aim to add +1 rep or +1.25kg next session!`,
      recentVolume: single.volume,
    };
  }

  const current = sessions[sessions.length - 1];
  const previous = sessions[sessions.length - 2];

  const volDelta = current.volume - previous.volume;
  const pctChange = previous.volume > 0 ? Math.round((volDelta / previous.volume) * 100) : 0;
  const e1rmDelta = current.max1RM - previous.max1RM;

  // Check for plateau: last 3 sessions have near-identical volume and max1RM (within 2%)
  if (sessions.length >= 3) {
    const anteprevious = sessions[sessions.length - 3];
    const isVolumeSame =
      Math.abs(current.volume - previous.volume) < 20 &&
      Math.abs(previous.volume - anteprevious.volume) < 20;
    const is1RMSame =
      Math.abs(current.max1RM - previous.max1RM) < 1 &&
      Math.abs(previous.max1RM - anteprevious.max1RM) < 1;

    if (isVolumeSame && is1RMSame) {
      return {
        status: "PLATEAU",
        headline: "Stagnation / Plateau Detected",
        recommendation:
          "Same volume and load across 3 consecutive sessions. Time for progressive overload: increase barbell load by +1.25kg - 2.5kg or push 1 extra rep on set 1.",
        percentChange: 0,
        recentVolume: current.volume,
        previousVolume: previous.volume,
      };
    }
  }

  if (pctChange > 0 || e1rmDelta > 0) {
    return {
      status: "PROGRESSING",
      headline: `Progressive Overload Achieved (+${pctChange}%)`,
      recommendation: `Volume increased by ${volDelta > 0 ? `+${volDelta}kg` : "load progression"} compared to last session. Hypertrophy stimulus achieved!`,
      percentChange: pctChange,
      recentVolume: current.volume,
      previousVolume: previous.volume,
    };
  }

  return {
    status: "DELOAD",
    headline: "Lighter / Deload Session",
    recommendation: `Volume is ${Math.abs(pctChange)}% lower than previous session. Great for recovery and CNS regeneration.`,
    percentChange: pctChange,
    recentVolume: current.volume,
    previousVolume: previous.volume,
  };
}
