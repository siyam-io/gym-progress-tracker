"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { db, LocalWorkoutSession, initializeLocalDb } from "@/lib/db/dexie";
import { SessionDetailModal } from "@/components/history/SessionDetailModal";
import { BackupModal } from "@/components/history/BackupModal";
import { HistoryCardSkeleton } from "@/components/ui/Skeleton";

interface WorkoutHistoryItem extends LocalWorkoutSession {
  completedSetsCount: number;
  prCount: number;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Modals
  const [inspectingSessionId, setInspectingSessionId] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      await initializeLocalDb();
      const completed = await db.workoutSessions
        .where("status")
        .equals("COMPLETED")
        .reverse()
        .sortBy("startTime");

      const items: WorkoutHistoryItem[] = [];

      for (const s of completed) {
        const sets = await db.setLogs.where("sessionId").equals(s.id).toArray();
        const completedSets = sets.filter((st) => st.isCompleted);
        const prCount = completedSets.filter((st) => st.isPR).length;

        items.push({
          ...s,
          completedSetsCount: completedSets.length,
          prCount,
        });
      }

      setSessions(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  // Map of date (YYYY-MM-DD) -> list of session IDs
  const workoutDatesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of sessions) {
      const dateKey = new Date(s.startTime).toISOString().slice(0, 10);
      const existing = map.get(dateKey) || [];
      existing.push(s.id);
      map.set(dateKey, existing);
    }
    return map;
  }, [sessions]);

  // Calendar calculations (Mon-Sun)
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based indexing: Sunday is 7, Monday is 1
    const firstDayWeekIndex = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      hasWorkout: boolean;
      isToday: boolean;
    }> = [];

    // Empty cells before 1st of month
    for (let i = 0; i < firstDayWeekIndex; i++) {
      days.push({
        dayNum: 0,
        dateKey: `prev-${i}`,
        isCurrentMonth: false,
        hasWorkout: false,
        isToday: false,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = dateObj.toISOString().slice(0, 10);
      const hasWorkout = workoutDatesMap.has(dateKey);

      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        hasWorkout,
        isToday: dateKey === todayStr,
      });
    }

    return days;
  }, [currentMonthDate, workoutDatesMap]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    );
  };

  const formatMonthTitle = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filtered session list
  const filteredSessions = useMemo(() => {
    if (!selectedDateFilter) return sessions;
    return sessions.filter(
      (s) => new Date(s.startTime).toISOString().slice(0, 10) === selectedDateFilter
    );
  }, [sessions, selectedDateFilter]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 max-w-md mx-auto selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header */}
      <header className="px-5 pt-6 pb-4 border-b border-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100">Workout Log</h1>
            <span className="text-[11px] text-zinc-500 font-semibold">Calendar & History</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBackupModal(true)}
          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Backup</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="p-5 space-y-6 flex-1">
        {/* Interactive Monthly Calendar Card */}
        <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
            <h2 className="font-bold text-sm text-zinc-200">
              {formatMonthTitle(currentMonthDate)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d, index) => {
              if (!d.isCurrentMonth) {
                return <div key={`empty-${index}`} className="h-9 w-full" />;
              }

              const isSelected = selectedDateFilter === d.dateKey;

              return (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDateFilter(null); // toggle off
                    } else {
                      setSelectedDateFilter(d.dateKey);
                    }
                  }}
                  className={`h-9 w-full rounded-xl flex flex-col items-center justify-center relative font-mono text-xs transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/30 scale-105 z-10"
                      : d.isToday
                      ? "bg-zinc-800 text-zinc-100 font-bold border border-emerald-500/40"
                      : "bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-300"
                  }`}
                >
                  <span>{d.dayNum}</span>

                  {/* Glowing Green Workout Dot */}
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

          {/* Filter Status & Clear Button */}
          {selectedDateFilter && (
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Filtered: <span className="font-bold text-zinc-200">{selectedDateFilter}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Show All</span>
              </button>
            </div>
          )}
        </section>

        {/* Workout Sessions List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {selectedDateFilter ? "Sessions on Selected Date" : "All Workout Logs"} ({filteredSessions.length})
            </h2>
            <span className="text-[11px] text-zinc-500">Tap to inspect</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <HistoryCardSkeleton />
              <HistoryCardSkeleton />
              <HistoryCardSkeleton />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl p-6">
              <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-400">
                {selectedDateFilter ? "No workout on this day" : "No completed workouts yet"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {selectedDateFilter
                  ? "Select another day or tap 'Show All'."
                  : "Complete a workout session on the floor to see your history."}
              </p>
            </div>
          ) : (
            filteredSessions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setInspectingSessionId(item.id)}
                className="w-full text-left bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 space-y-3 shadow-sm transition-all active:scale-[0.99] group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-xs text-zinc-400 mt-0.5 block">{formatDate(item.startTime)}</span>
                  </div>

                  {item.prCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                      <Trophy className="w-3 h-3" />
                      <span>{item.prCount} PR{item.prCount > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/60 text-center">
                  <div className="bg-zinc-950/70 p-2 rounded-xl border border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Time</span>
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {formatDuration(item.durationSec)}
                    </span>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-xl border border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Volume</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {item.totalVolume} kg
                    </span>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-xl border border-zinc-800/60">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Sets</span>
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {item.completedSetsCount} sets
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </section>
      </main>

      {/* Session Inspector Drawer / Modal */}
      <SessionDetailModal
        sessionId={inspectingSessionId}
        onClose={() => setInspectingSessionId(null)}
        onDeleted={() => void loadHistory()}
      />

      {/* Data Backup / Restore Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onDataRestored={() => void loadHistory()}
      />
    </div>
  );
}
