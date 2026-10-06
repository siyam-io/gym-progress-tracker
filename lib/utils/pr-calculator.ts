import { db } from "@/lib/db/dexie";

/**
 * Calculates Estimated 1-Rep Max (e1RM) using the Brzycki formula:
 * 1RM = Weight * (36 / (37 - Reps))
 *
 * For reps === 1: 1RM = Weight.
 * Guarded against division by zero or negative values when reps >= 37.
 */
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;

  // Protect against Brzycki singularity for extreme endurance sets
  const effectiveReps = Math.min(reps, 30);
  const e1rm = weight * (36 / (37 - effectiveReps));

  // Round to 1 decimal place
  return Math.round(e1rm * 10) / 10;
}

export interface PRCheckResult {
  isPR: boolean;
  current1RM: number;
  previousMax1RM: number;
  difference: number;
}

/**
 * Checks whether a given weight and rep combination beats the historical
 * best 1RM recorded in IndexedDB for the given exercise.
 */
export async function checkIfPR(
  exerciseId: string,
  weight: number,
  reps: number,
  currentSetId?: string
): Promise<PRCheckResult> {
  const current1RM = calculate1RM(weight, reps);
  if (current1RM <= 0) {
    return { isPR: false, current1RM: 0, previousMax1RM: 0, difference: 0 };
  }

  try {
    // Get all historical completed sets for this exercise
    const completedSets = await db.setLogs
      .where("exerciseId")
      .equals(exerciseId)
      .filter((set) => set.isCompleted && set.id !== currentSetId)
      .toArray();

    let previousMax1RM = 0;
    for (const set of completedSets) {
      const set1RM = calculate1RM(set.weight, set.reps);
      if (set1RM > previousMax1RM) {
        previousMax1RM = set1RM;
      }
    }

    // It's a PR if current 1RM strictly exceeds the historical max
    // If no prior history, any valid set with weight > 0 can establish the baseline or first PR
    const isPR = previousMax1RM > 0 ? current1RM > previousMax1RM : current1RM > 0;
    const difference = Math.max(0, Math.round((current1RM - previousMax1RM) * 10) / 10);

    return {
      isPR,
      current1RM,
      previousMax1RM,
      difference,
    };
  } catch (error) {
    console.error("[PR Calculator] Error checking PR in IndexedDB:", error);
    return {
      isPR: false,
      current1RM,
      previousMax1RM: 0,
      difference: 0,
    };
  }
}
