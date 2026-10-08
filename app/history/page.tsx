"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  Dumbbell,
  ShieldCheck,
  X,
  Filter,
  Trash2,
  Play,
  RotateCcw,
  Search,
  Activity,
  CalendarDays,
  ListFilter,
  Pencil,
} from "lucide-react";
import {
  db,
  LocalWorkoutSession,
  initializeLocalDb,
  deleteWorkoutSession,
  LocalExercise,
  getSessionDetail,
  SessionDetailData,
} from "@/lib/db/dexie";
import { SessionDetailModal } from "@/components/history/SessionDetailModal";
import { EditWorkoutSessionModal } from "@/components/history/EditWorkoutSessionModal";
import { BackupModal } from "@/components/history/BackupModal";
import { HistoryCardSkeleton } from "@/components/ui/Skeleton";
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

/**
 * Returns a stable local YYYY-MM-DD date key preventing any UTC/GMT timezone shifts.
 */
function getLocalDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HistoryPage() {
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
      setIsLoading(true);
      await initializeLocalDb();

      const [completedSessions, allSets, allExercises] = await Promise.all([
        db.workoutSessions
          .where("status")
          .equals("COMPLETED")
          .reverse()
          .sortBy("startTime"),
        db.setLogs.toArray(),
        db.exercises.toArray(),
      ]);

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
        const sessionSets = setsBySession.get(s.id) || [];
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

        for (const [exId, sets] of exerciseSetsMap.entries()) {
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
      console.error("Failed to load workout history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();

    const handleDataSynced = () => {
      void loadHistory();
    };

    window.addEventListener("pulse-data-synced", handleDataSynced);
    return () => {
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

  // Execute deletion with optimistic UI update
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

  // Calendar Days (Mon - Sun) with fixed 7-column layout and predictable rows
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // Monday is index 0, Sunday is index 6
    const firstDayWeekIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      hasWorkout: boolean;
      workoutCount: number;
      isToday: boolean;
    }> = [];

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

    // Suffix empty slots to fill the final week completely (multiple of 7)
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
      // 1. Date filter (uses local date key)
      if (selectedDateFilter) {
        const sessionDate = getLocalDateKey(s.startTime);
        if (sessionDate !== selectedDateFilter) return false;
      }

      // 2. Search query
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

      // 3. Muscle category filter
      if (selectedMuscleFilter !== "All") {
        const matches = s.primaryMuscles.some(
          (m) => m.toLowerCase() === selectedMuscleFilter.toLowerCase()
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [sessions, selectedDateFilter, searchQuery, selectedMuscleFilter]);

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    if (diffDays === 0) return `Today • ${timeStr}`;
    if (diffDays === 1) return `Yesterday • ${timeStr}`;
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
      return `${weekday} (${diffDays}d ago) • ${timeStr}`;
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFriendlyDate = (dateKey: string) => {
    const parts = dateKey.split("-");
    if (parts.length !== 3) return dateKey;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const todayKey = getLocalDateKey(new Date());

    if (dateKey === todayKey) {
      return `Today, ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-32 min-w-0 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header */}
      <header className="w-full px-5 pt-6 pb-4 border-b border-zinc-900/80 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100">
              Training Logbook
            </h1>
            <span className="text-[11px] text-zinc-500 font-semibold block">
              {sessions.length} total workout{sessions.length !== 1 ? "s" : ""} recorded
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBackupModal(true)}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-emerald-400 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shrink-0"
          title="Backup & Export Data"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Export</span>
        </button>
      </header>

      {/* Main Container - Rigid Full Width */}
      <main className="w-full p-4 space-y-4 flex-1 flex flex-col">
        {/* Monthly Performance KPI Banner */}
        <section className="w-full bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              This Month&apos;s Training
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-500">
              {new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Sessions</span>
              <span className="text-sm font-black font-mono text-zinc-100">
                {monthlyStats.count}
              </span>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Volume</span>
              <span className="text-sm font-black font-mono text-emerald-400 truncate block">
                {monthlyStats.totalVolume > 1000
                  ? `${Math.round(monthlyStats.totalVolume / 1000)}t`
                  : `${monthlyStats.totalVolume}k`}
              </span>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">Hours</span>
              <span className="text-sm font-black font-mono text-zinc-200">
                {monthlyStats.hours}h
              </span>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">PRs</span>
              <span className="text-sm font-black font-mono text-amber-400">
                {monthlyStats.totalPRs}
              </span>
            </div>
          </div>
        </section>

        {/* View Toggle: Feed View vs Calendar Heatmap */}
        <section className="w-full flex items-center justify-between gap-2">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full">
            <button
              type="button"
              onClick={() => setViewMode("feed")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === "feed"
                  ? "bg-emerald-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Workouts Log ({sessions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === "calendar"
                  ? "bg-emerald-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </section>

        {/* CALENDAR VIEW MODE */}
        {viewMode === "calendar" && (
          <section className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
            {/* Calendar Month Navigation Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-zinc-100">
                  {currentMonthDate.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentMonthDate(new Date())}
                  className="px-2 py-0.5 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonthDate(
                      new Date(
                        currentMonthDate.getFullYear(),
                        currentMonthDate.getMonth() - 1,
                        1
                      )
                    )
                  }
                  className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonthDate(
                      new Date(
                        currentMonthDate.getFullYear(),
                        currentMonthDate.getMonth() + 1,
                        1
                      )
                    )
                  }
                  className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header - Rigid 7 columns */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-full">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Days Grid - Rigid Aspect-Ratio Cells Never Shrink */}
            <div className="grid grid-cols-7 gap-1 text-center w-full">
              {calendarDays.map((d, index) => {
                if (!d.isCurrentMonth) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="w-full aspect-square min-h-[38px] max-h-[44px]"
                    />
                  );
                }

                const isSelected = selectedDateFilter === d.dateKey;

                return (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDateFilter(null);
                      } else {
                        setSelectedDateFilter(d.dateKey);
                      }
                    }}
                    className={`w-full aspect-square min-h-[38px] max-h-[44px] rounded-xl flex flex-col items-center justify-center relative font-mono text-xs transition-colors duration-150 select-none ${
                      isSelected
                        ? "bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950"
                        : d.isToday
                        ? "bg-zinc-800 text-zinc-100 font-bold border border-emerald-500/50"
                        : "bg-zinc-950/60 hover:bg-zinc-800/80 text-zinc-300 border border-transparent"
                    }`}
                  >
                    <span>{d.dayNum}</span>

                    {/* Activity Indicator Dot */}
                    {d.hasWorkout && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-zinc-950"
                            : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Footer Status (Embedded so position never shifts!) */}
            <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs min-h-[32px]">
              {selectedDateFilter ? (
                <>
                  <span className="text-zinc-300 flex items-center gap-1.5 font-medium">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    Selected:{" "}
                    <span className="font-bold text-emerald-400">
                      {formatFriendlyDate(selectedDateFilter)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear Filter</span>
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    Green dots indicate logged workouts
                  </span>
                  <span className="font-mono text-zinc-400">
                    {workoutDatesMap.size} active days
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Search & Fast Filters */}
        <section className="w-full space-y-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by workout or exercise (e.g. Bench, Push)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Muscle Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full">
            {["All", "Chest", "Back", "Shoulders", "Legs", "Arms", "Core"].map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => setSelectedMuscleFilter(muscle)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                  selectedMuscleFilter === muscle
                    ? "bg-zinc-800 text-emerald-400 border border-emerald-500/40"
                    : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
        </section>

        {/* WORKOUT CARDS FEED */}
        <section className="w-full space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 w-full">
            <span>
              {selectedDateFilter
                ? `Sessions on ${formatFriendlyDate(selectedDateFilter)}`
                : `Logged Sessions (${filteredSessions.length})`}
            </span>
            {filteredSessions.length > 0 && (
              <span className="text-[10px] text-zinc-500 lowercase">tap card to inspect</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3 w-full">
              <HistoryCardSkeleton />
              <HistoryCardSkeleton />
              <HistoryCardSkeleton />
            </div>
          ) : filteredSessions.length === 0 ? (
            /* High-Caliber Empty State with Rigid Full Width */
            <div className="w-full text-center py-12 px-6 border border-dashed border-zinc-800/90 rounded-3xl bg-zinc-900/30 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-600 shadow-xl shadow-emerald-500/5">
                <Dumbbell className="w-8 h-8 text-emerald-400/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-zinc-200">
                  {selectedDateFilter
                    ? `No Workouts on ${formatFriendlyDate(selectedDateFilter)}`
                    : searchQuery || selectedMuscleFilter !== "All"
                    ? "No sessions match filter"
                    : "No Workout History Yet"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  {selectedDateFilter
                    ? "Rest day or recovery. Select another highlighted day on the calendar or start a new workout."
                    : searchQuery || selectedMuscleFilter !== "All"
                    ? "Try adjusting your filters or search terms."
                    : "Every set, weight, and personal record you log on the gym floor will appear here."}
                </p>
              </div>

              {selectedDateFilter || searchQuery || selectedMuscleFilter !== "All" ? (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateFilter(null);
                      setSearchQuery("");
                      setSelectedMuscleFilter("All");
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                  >
                    Show All Workouts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void startWorkout("Floor Session", []);
                      router.push("/workout/active");
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>Start Workout</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => {
                      void startWorkout("Quick Workout", []);
                      router.push("/workout/active");
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-4 h-4 fill-zinc-950" />
                    <span>Start Empty Workout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors"
                  >
                    Browse Saved Routines
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Rich Workout Cards */
            filteredSessions.map((item) => (
              <div
                key={item.id}
                onClick={() => setInspectingSessionId(item.id)}
                className="w-full bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/90 rounded-2xl p-4 space-y-3.5 shadow-sm transition-all hover:bg-zinc-900 active:scale-[0.99] cursor-pointer group relative overflow-hidden"
              >
                {/* Top Row: Title, Date & Delete Trigger */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">
                      {formatRelativeDate(item.startTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* PR Count Pill */}
                    {item.prCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        <Trophy className="w-3 h-3 fill-amber-500/20" />
                        <span>{item.prCount} PR{item.prCount > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    {/* Direct Edit Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => void handleDirectEdit(item.id, e)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Edit workout details and sets"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Direct Delete Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(item);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                      title="Delete workout session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Exercise Breakdown Preview Chips */}
                {item.exercisePreviews.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-zinc-800/60 w-full">
                    <div className="flex flex-wrap gap-1.5">
                      {item.exercisePreviews.map((ep) => (
                        <span
                          key={ep.name}
                          className="text-[11px] font-medium px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 flex items-center gap-1.5"
                        >
                          <span className="text-zinc-200 font-bold">{ep.name}</span>
                          <span className="text-zinc-500 font-mono text-[10px]">
                            {ep.setsCount}s
                          </span>
                          {ep.topWeight > 0 && (
                            <span className="text-emerald-400 font-mono text-[10px] font-bold">
                              • {ep.topWeight}kg
                            </span>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Muscle Focus Tags */}
                    {item.primaryMuscles.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 pt-0.5">
                        <span className="font-semibold text-zinc-400">Targeted:</span>
                        <span>{item.primaryMuscles.join(" • ")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row: Metrics & Quick Repeat Action */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs w-full">
                  <div className="flex items-center gap-3 text-zinc-400 font-mono font-bold">
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatDuration(item.durationSec)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                      {item.totalVolume.toLocaleString()} kg
                    </span>
                    <span>•</span>
                    <span className="text-zinc-400">
                      {item.completedSetsCount} sets
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => void handleDirectEdit(item.id, e)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                      title="Edit workout details and sets"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void handleRepeatWorkout(item, e)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                      title="Run this workout again on gym floor"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rerun</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Confirmation Modal for Session Deletion with High Z-Index & Backdrop Dismiss */}
      {sessionToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setSessionToDelete(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-zinc-900 border border-red-500/30 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-zinc-100">Delete Workout?</h3>
                <span className="text-xs text-zinc-400 truncate block">
                  {sessionToDelete.title}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete this workout session? All logged sets, volume ({sessionToDelete.totalVolume.toLocaleString()} kg), and PR records from this session will be permanently removed.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteSession()}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-lg shadow-red-600/20"
              >
                {isDeleting ? "Deleting..." : "Delete Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Inspector Drawer / Modal */}
      <SessionDetailModal
        sessionId={inspectingSessionId}
        onClose={() => setInspectingSessionId(null)}
        onDeleted={() => void loadHistory()}
        onUpdated={() => void loadHistory()}
      />

      {/* Direct Workout Session Edit Modal */}
      {editingSessionData && (
        <EditWorkoutSessionModal
          sessionData={editingSessionData}
          isOpen={!!editingSessionData}
          onClose={() => setEditingSessionData(null)}
          onSaved={() => void loadHistory()}
        />
      )}

      {/* Data Backup / Export Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onDataRestored={() => void loadHistory()}
      />
    </div>
  );
}
