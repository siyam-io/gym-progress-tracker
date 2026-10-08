import { db } from "@/lib/db/dexie";
import { LocalRoutineItem, LocalSetLog } from "@/types/workout";
import { enqueueSyncMutation } from "@/lib/sync/client-sync";

/**
 * Scan and heal any duplicate records in local Dexie database:
 * 1. Routine items appearing multiple times inside the same routine.
 * 2. Set logs sharing identical set numbers in the same exercise/session.
 * 3. Duplicate sessions created by offline sync race conditions.
 */
export async function deduplicateDatabaseRecords(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Deduplicate routine items
    const allRoutines = await db.routines.toArray();
    for (const r of allRoutines) {
      const items = await db.routineItems.where("routineId").equals(r.id).sortBy("orderIndex");
      const seenExIds = new Set<string>();
      const idsToDelete: string[] = [];
      const cleanItems: LocalRoutineItem[] = [];

      for (const it of items) {
        if (seenExIds.has(it.exerciseId)) {
          idsToDelete.push(it.id);
        } else {
          seenExIds.add(it.exerciseId);
          cleanItems.push(it);
        }
      }

      if (idsToDelete.length > 0) {
        await db.routineItems.where("id").anyOf(idsToDelete).delete();
        // Re-index remaining items 1..N
        const reindexed = cleanItems.map((it, idx) => ({ ...it, orderIndex: idx + 1 }));
        await db.routineItems.bulkPut(reindexed);
      }
    }

    // 2. Deduplicate sets in workout sessions
    const allSessions = await db.workoutSessions.toArray();
    for (const session of allSessions) {
      const sets = await db.setLogs.where("sessionId").equals(session.id).toArray();
      sets.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() ||
          a.setNumber - b.setNumber
      );
      const byExercise = new Map<string, LocalSetLog[]>();
      for (const s of sets) {
        if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
        byExercise.get(s.exerciseId)!.push(s);
      }

      let sessionModified = false;
      const idsToDelete: string[] = [];
      const setsToUpdate: LocalSetLog[] = [];

      for (const exSets of byExercise.values()) {
        const seenSetNumbers = new Set<number>();
        const uniqueSets: LocalSetLog[] = [];

        for (const s of exSets) {
          if (seenSetNumbers.has(s.setNumber)) {
            const prevIndex = uniqueSets.findIndex((u) => u.setNumber === s.setNumber);
            if (prevIndex !== -1 && !uniqueSets[prevIndex].isCompleted && s.isCompleted) {
              idsToDelete.push(uniqueSets[prevIndex].id);
              uniqueSets[prevIndex] = s;
            } else {
              idsToDelete.push(s.id);
            }
            sessionModified = true;
          } else {
            seenSetNumbers.add(s.setNumber);
            uniqueSets.push(s);
          }
        }

        uniqueSets.forEach((s, idx) => {
          if (s.setNumber !== idx + 1) {
            s.setNumber = idx + 1;
            setsToUpdate.push(s);
            sessionModified = true;
          }
        });
      }

      if (idsToDelete.length > 0) {
        await db.setLogs.where("id").anyOf(idsToDelete).delete();
      }

      if (setsToUpdate.length > 0) {
        await db.setLogs.bulkPut(setsToUpdate);
      }

      if (sessionModified) {
        const remainingSets = await db.setLogs.where("sessionId").equals(session.id).toArray();
        const totalVolume = remainingSets
          .filter((s) => s.isCompleted)
          .reduce((sum, s) => sum + s.weight * s.reps, 0);
        await db.workoutSessions.update(session.id, { totalVolume: Math.round(totalVolume) });
      }
    }

    // 3. Deduplicate duplicate workout sessions
    const freshSessions = await db.workoutSessions.toArray();
    freshSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const processedSessionIds = new Set<string>();
    const sessionIdsToDelete: string[] = [];

    for (let i = 0; i < freshSessions.length; i++) {
      const s1 = freshSessions[i];
      if (processedSessionIds.has(s1.id)) continue;

      const t1 = new Date(s1.startTime).getTime();
      const normTitle1 = (s1.title || "").trim().toLowerCase();

      for (let j = i + 1; j < freshSessions.length; j++) {
        const s2 = freshSessions[j];
        if (processedSessionIds.has(s2.id)) continue;

        const t2 = new Date(s2.startTime).getTime();
        const normTitle2 = (s2.title || "").trim().toLowerCase();

        // Check if duplicate: same title and start time within 15 minutes
        const timeDiffMinutes = Math.abs(t1 - t2) / (1000 * 60);
        const isDuplicateCandidate = normTitle1 === normTitle2 && timeDiffMinutes <= 15;

        if (isDuplicateCandidate) {
          const sets1 = await db.setLogs.where("sessionId").equals(s1.id).toArray();
          const sets2 = await db.setLogs.where("sessionId").equals(s2.id).toArray();

          const completed1 = sets1.filter((s) => s.isCompleted).length;
          const completed2 = sets2.filter((s) => s.isCompleted).length;

          let winner = s1;
          let loser = s2;
          let winnerSets = sets1;
          let loserSets = sets2;

          if (completed2 > completed1 || (completed2 === completed1 && (s2.totalVolume || 0) > (s1.totalVolume || 0))) {
            winner = s2;
            loser = s1;
            winnerSets = sets2;
            loserSets = sets1;
          }

          // Transfer any unique completed sets from loser to winner
          const winnerKeySet = new Set(winnerSets.map((s) => `${s.exerciseId}-${s.setNumber}`));
          for (const lSet of loserSets) {
            const key = `${lSet.exerciseId}-${lSet.setNumber}`;
            if (!winnerKeySet.has(key)) {
              await db.setLogs.update(lSet.id, { sessionId: winner.id });
              winnerKeySet.add(key);
            } else {
              await db.setLogs.delete(lSet.id);
            }
          }

          processedSessionIds.add(loser.id);
          sessionIdsToDelete.push(loser.id);

          // Update winner totalVolume
          const finalSets = await db.setLogs.where("sessionId").equals(winner.id).toArray();
          const newVol = finalSets
            .filter((s) => s.isCompleted)
            .reduce((sum, s) => sum + s.weight * s.reps, 0);
          await db.workoutSessions.update(winner.id, { totalVolume: Math.round(newVol) });

          // Queue cloud deletion for duplicate session
          await enqueueSyncMutation("workoutSession", loser.id, "DELETE", { id: loser.id });
        }
      }
      processedSessionIds.add(s1.id);
    }

    if (sessionIdsToDelete.length > 0) {
      console.log(`[Dexie Deduplication] Purging ${sessionIdsToDelete.length} duplicate workout sessions`);
      await db.workoutSessions.where("id").anyOf(sessionIdsToDelete).delete();
    }
  } catch (err) {
    console.error("[Dexie Deduplication] Error during cleanup:", err);
  }
}
