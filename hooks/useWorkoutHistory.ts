import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  db,
  initializeLocalDb,
  deleteWorkoutSession,
  getSessionDetail,
  pullSyncFromServer,
} from "@/lib/db/dexie";
import {
  LocalExercise,
  SessionDetailData,
  LocalWorkoutSession,
} from "@/types/workout";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { toast } from "@/stores/useToastStore";

export interface WorkoutHistoryExercisePreview {
  name: string;
  category: string;
  primaryMuscle: string;
  setsCount: number;
  topWeight: number;
  topReps: number;
}

export interface WorkoutHistoryItem extends LocalWorkoutSession {
  completedSetsCount: number;
  prCount: number;
  exercisePreviews: WorkoutHistoryExercisePreview[];
  primaryMuscles: string[];
}

export interface CalendarDayItem {
  dayNum: number;
  dateKey: string;
  isCurrentMonth: boolean;
  hasWorkout: boolean;
  workoutCount: number;
  isToday: boolean;
}

/**
 * Returns a stable local YYYY-MM-DD date key preventing any UTC/GMT timezone shifts.
 */
export function getLocalDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useWorkoutHistory() {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();

  const [sessions, setSessions] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state: 'feed' (List) vs 'calendar' (Calendar Heatmap)
  const [viewMode, setViewMode] = useState<"feed" | "calendar">("feed");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState("All");

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Modals & Dialogs
  const [inspectingSessionId, setInspectingSessionId] = useState<string | null>(null);
  const [editingSessionData, setEditingSessionData] = useState<SessionDetailData | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      await initializeLocalDb();

      const [completedSessions, initialSets, allExercises, allRoutineItems] = await Promise.all([
        db.workoutSessions
          .where("status")
          .equals("COMPLETED")
          .reverse()
          .sortBy("startTime"),
        db.setLogs.toArray(),
        db.exercises.toArray(),
        db.routineItems.toArray(),
      ]);

      const routineOrderMap = new Map<string, Map<string, number>>();
      for (const item of allRoutineItems) {
        if (!routineOrderMap.has(item.routineId)) {
          routineOrderMap.set(item.routineId, new Map());
        }
        routineOrderMap.get(item.routineId)!.set(item.exerciseId, item.orderIndex);
      }

      let allSets = initialSets;

      // If any completed session is missing sets and user is online, attempt cloud sync pull
      const hasEmptySessions = completedSessions.some(
        (s) => !allSets.some((st) => st.sessionId === s.id)
      );
      if (hasEmptySessions && typeof window !== "undefined" && navigator.onLine) {
        try {
          const syncRes = await pullSyncFromServer();
          if (syncRes.success) {
            allSets = await db.setLogs.toArray();
          }
        } catch (e) {
          console.warn("[useWorkoutHistory] Sync pull attempt failed:", e);
        }
      }

      const exMap = new Map<string, LocalExercise>(allExercises.map((e) => [e.id, e]));

      // Group completed sets by sessionId
      const setsBySession = new Map<string, typeof allSets>();
      for (const set of allSets) {
        if (!set.isCompleted) continue;
        const arr = setsBySession.get(set.sessionId) || [];
        arr.push(set);
        setsBySession.set(set.sessionId, arr);
      }

      const items: WorkoutHistoryItem[] = [];

      for (const s of completedSessions) {
        let sessionSets = setsBySession.get(s.id) || [];
        // Fallback: If no sets marked completed, include all sets for this session
        if (sessionSets.length === 0) {
          sessionSets = allSets.filter((st) => st.sessionId === s.id);
        }
        const prCount = sessionSets.filter((st) => st.isPR).length;

        // Group sets by exercise for preview chips
        const exerciseSetsMap = new Map<string, typeof allSets>();
        for (const st of sessionSets) {
          const arr = exerciseSetsMap.get(st.exerciseId) || [];
          arr.push(st);
          exerciseSetsMap.set(st.exerciseId, arr);
        }

        const previews: WorkoutHistoryExercisePreview[] = [];
        const muscles = new Set<string>();

        const exerciseEntries = Array.from(exerciseSetsMap.entries());
        if (s.routineId && routineOrderMap.has(s.routineId)) {
          const orderMap = routineOrderMap.get(s.routineId)!;
          exerciseEntries.sort(
            ([a], [b]) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999)
          );
        }

        for (const [exId, sets] of exerciseEntries) {
          const ex = exMap.get(exId);
          const name = ex?.name || "Exercise";
          const category = ex?.category || "BARBELL";
          const primaryMuscle = ex?.primaryMuscle || "General";
          muscles.add(primaryMuscle);

          let topWeight = 0;
          let topReps = 0;
          for (const st of sets) {
            if (st.weight > topWeight) {
              topWeight = st.weight;
              topReps = st.reps;
            }
          }

          previews.push({
            name,
            category,
            primaryMuscle,
            setsCount: sets.length,
            topWeight,
            topReps,
          });
        }

        items.push({
          ...s,
          completedSetsCount: sessionSets.length,
          prCount,
          exercisePreviews: previews,
          primaryMuscles: Array.from(muscles),
        });
      }

      setSessions(items);
    } catch (err) {
      console.error("[useWorkoutHistory] Failed to load workout history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) void loadHistory();
    });

    const handleDataSynced = () => {
      if (!cancelled) void loadHistory();
    };

    window.addEventListener("pulse-data-synced", handleDataSynced);
    return () => {
      cancelled = true;
      window.removeEventListener("pulse-data-synced", handleDataSynced);
    };
  }, [loadHistory]);

  const handleDirectEdit = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const detail = await getSessionDetail(sessionId);
      if (detail) {
        setEditingSessionData(detail);
      } else {
        toast.error("Could not load workout details");
      }
    } catch (err) {
      console.error("Failed to load session for editing:", err);
      toast.error("Failed to load workout details");
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeleting(true);
      const targetId = sessionToDelete.id;
      const targetTitle = sessionToDelete.title;

      // Optimistically update UI
      setSessions((prev) => prev.filter((s) => s.id !== targetId));
      setSessionToDelete(null);

      // Persist in Dexie & queue sync
      await deleteWorkoutSession(targetId);
      toast.success(`"${targetTitle}" deleted from history`);
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast.error("Failed to delete session");
      void loadHistory();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRepeatWorkout = async (item: WorkoutHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const allEx = await db.exercises.toArray();
      const exMap = new Map(allEx.map((ex) => [ex.id, ex]));
      const sets = await db.setLogs.where("sessionId").equals(item.id).toArray();
      const uniqueExIds = Array.from(new Set(sets.map((s) => s.exerciseId)));
      const exercises = uniqueExIds
        .map((id) => exMap.get(id))
        .filter((ex): ex is LocalExercise => !!ex);

      await startWorkout(item.title, exercises, item.routineId ?? undefined);
      router.push("/workout/active");
    } catch (err) {
      console.error("Failed to rerun workout:", err);
      toast.error("Failed to start workout");
    }
  };

  // Monthly KPI calculation
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisMonthSessions = sessions.filter((s) => {
      const d = new Date(s.startTime);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const count = thisMonthSessions.length;
    const totalVolume = thisMonthSessions.reduce((sum, s) => sum + s.totalVolume, 0);
    const totalSeconds = thisMonthSessions.reduce((sum, s) => sum + s.durationSec, 0);
    const totalPRs = thisMonthSessions.reduce((sum, s) => sum + s.prCount, 0);
    const hours = (totalSeconds / 3600).toFixed(1);

    return { count, totalVolume, hours, totalPRs };
  }, [sessions]);

  // Calendar dates mapping using local date keys
  const workoutDatesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of sessions) {
      const dateKey = getLocalDateKey(s.startTime);
      const existing = map.get(dateKey) || [];
      existing.push(s.id);
      map.set(dateKey, existing);
    }
    return map;
  }, [sessions]);

  // Calendar Days (Mon - Sun) with fixed 7-column layout
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // Monday is index 0, Sunday is index 6
    const firstDayWeekIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDayItem[] = [];

    // Prefix empty slots before first day of month
    for (let i = 0; i < firstDayWeekIndex; i++) {
      days.push({
        dayNum: 0,
        dateKey: `prev-${i}`,
        isCurrentMonth: false,
        hasWorkout: false,
        workoutCount: 0,
        isToday: false,
      });
    }

    const todayKey = getLocalDateKey(new Date());

    // Month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = getLocalDateKey(dateObj);
      const workouts = workoutDatesMap.get(dateKey) || [];

      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        hasWorkout: workouts.length > 0,
        workoutCount: workouts.length,
        isToday: dateKey === todayKey,
      });
    }

    // Suffix empty slots to fill the final week completely
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let j = 0; j < needed; j++) {
        days.push({
          dayNum: 0,
          dateKey: `next-${j}`,
          isCurrentMonth: false,
          hasWorkout: false,
          workoutCount: 0,
          isToday: false,
        });
      }
    }

    return days;
  }, [currentMonthDate, workoutDatesMap]);

  // Filtering (Search, Muscle, Date)
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedDateFilter) {
        const sessionDate = getLocalDateKey(s.startTime);
        if (sessionDate !== selectedDateFilter) return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesExercise = s.exercisePreviews.some((ep) =>
          ep.name.toLowerCase().includes(q)
        );
        const matchesMuscle = s.primaryMuscles.some((m) =>
          m.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesExercise && !matchesMuscle) return false;
      }

      if (selectedMuscleFilter !== "All") {
        const matches = s.primaryMuscles.some(
          (m) => m.toLowerCase() === selectedMuscleFilter.toLowerCase()
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [sessions, selectedDateFilter, searchQuery, selectedMuscleFilter]);

  return {
    sessions,
    filteredSessions,
    isLoading,
    loadHistory,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    currentMonthDate,
    setCurrentMonthDate,
    selectedDateFilter,
    setSelectedDateFilter,
    inspectingSessionId,
    setInspectingSessionId,
    editingSessionData,
    setEditingSessionData,
    showBackupModal,
    setShowBackupModal,
    sessionToDelete,
    setSessionToDelete,
    isDeleting,
    handleDirectEdit,
    confirmDeleteSession,
    handleRepeatWorkout,
    monthlyStats,
    calendarDays,
  };
}
