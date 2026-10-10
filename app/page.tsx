"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Flame,
  Clock,
  ChevronRight,
  Layers,
  Calendar,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Mail,
  Download,
  EyeOff,
  Check,
} from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import {
  initializeLocalDb,
  getRoutinesWithExercises,
  getWeeklyWorkoutStreak,
  RoutineWithExercises,
  StreakDay,
  deleteRoutine,
  resetToDefaultRoutines,
  setRoutineHomeVisibility,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";
import { CreateRoutineModal } from "@/components/routine/CreateRoutineModal";
import { AuthButton } from "@/components/auth/AuthButton";
import { DailyWeightCard } from "@/components/weight/DailyWeightCard";
import { SyncStatusBadge } from "@/components/navigation/SyncStatusBadge";
import { RoutineCardSkeleton } from "@/components/ui/Skeleton";
import { PulseLogo } from "@/components/ui/Logo";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function HomeDashboard() {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();

  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [streakData, setStreakData] = useState<{ days: StreakDay[]; completedCount: number }>({
    days: [],
    completedCount: 0,
  });
  const [greeting] = useState(() => {
    if (typeof window === "undefined") return "Welcome back";
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      await initializeLocalDb();
      const [fetchedRoutines, streak] = await Promise.all([
        getRoutinesWithExercises(),
        getWeeklyWorkoutStreak(),
      ]);
      setRoutines(fetchedRoutines);
      setStreakData(streak);
    } catch (err) {
      console.error("Failed to load initial dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleStartRoutine = async (routine: RoutineWithExercises) => {
    const exercises = routine.items.map((i) => i.exercise);
    await startWorkout(routine.name, exercises, routine.id);
    router.push("/workout/active");
  };

  const handleStartEmptyWorkout = async () => {
    const active = useWorkoutStore.getState().session;
    if (active && active.status === "IN_PROGRESS") {
      router.push("/workout/active");
      return;
    }
    await startWorkout("Empty Gym Floor", []);
    router.push("/workout/active");
  };

  const handleDeleteRoutine = (e: React.MouseEvent, routineId: string, routineName: string) => {
    e.stopPropagation();
    setRoutineToDelete({ id: routineId, name: routineName });
  };

  const handleConfirmDelete = async () => {
    if (!routineToDelete) return;
    await deleteRoutine(routineToDelete.id);
    setRoutineToDelete(null);
    await loadData();
  };

  const handleHideFromHome = async (e: React.MouseEvent, routineId: string, routineName: string) => {
    e.stopPropagation();
    try {
      await setRoutineHomeVisibility(routineId, false);
      setRoutines((prev) =>
        prev.map((r) => (r.id === routineId ? { ...r, showOnHome: false } : r))
      );
      toast.success(`"${routineName}" hidden from Home Dashboard`);
    } catch (err) {
      console.error("Failed to hide routine from home:", err);
      toast.error("Failed to update routine setting");
    }
  };

  const handleResetRoutines = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    await resetToDefaultRoutines();
    await loadData();
  };

  const formatLastCompleted = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 max-w-md mx-auto selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header Navbar */}
      <header className="px-4 sm:px-5 pt-5 pb-3.5 flex items-center justify-between border-b border-zinc-900/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <PulseLogo size="md" />
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-zinc-100 leading-none">
              PULSE GYM
            </h1>
            <span className="text-[11px] text-zinc-400 font-medium mt-0.5 truncate block whitespace-nowrap">
              {greeting}, Athlete
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SyncStatusBadge />
          <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-emerald-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{streakData.completedCount}</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="p-4 sm:p-5 space-y-5 flex-1">
        {/* Navigation Shortcut Pills to Services, About, and Contact */}
        <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          <Link
            href="/services"
            className="flex-1 py-1.5 px-2 rounded-xl text-center font-bold text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-1 text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Services</span>
          </Link>
          <span className="text-zinc-800">•</span>
          <Link
            href="/about"
            className="flex-1 py-1.5 px-2 rounded-xl text-center font-bold text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-1 text-[11px]"
          >
            <Info className="w-3 h-3 text-emerald-400" />
            <span>About</span>
          </Link>
          <span className="text-zinc-800">•</span>
          <Link
            href="/contact"
            className="flex-1 py-1.5 px-2 rounded-xl text-center font-bold text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-1 text-[11px]"
          >
            <Mail className="w-3 h-3 text-emerald-400" />
            <span>Contact</span>
          </Link>
        </div>

        {/* Weekly Streak Widget */}
        <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Weekly Training Streak
            </span>
            <span className="text-xs font-mono font-bold text-zinc-300">
              {streakData.completedCount} / 7 days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {streakData.days.map((day) => {
              const dayOfMonth = parseInt(day.dateStr.split("-")[2] || "0", 10);
              return (
                <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500">
                    {day.fullDay}
                  </span>
                  <div
                    className={`w-9 h-9 min-w-9 rounded-xl flex items-center justify-center transition-all ${
                      day.isCompleted
                        ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/25"
                        : day.isToday
                        ? "bg-zinc-900 border-2 border-emerald-500/60 text-zinc-300"
                        : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-600"
                    }`}
                  >
                    {day.isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3] text-zinc-950" />
                    ) : (
                      <span
                        className={`text-xs font-mono font-bold ${
                          day.isToday ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      >
                        {dayOfMonth}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Daily Weight Logger */}
        <DailyWeightCard />

        {/* Quick Launch Card */}
        <section className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-500/30 flex items-center justify-between shadow-lg shadow-emerald-950/20">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-0.5">
              Instant Session
            </span>
            <h2 className="text-sm font-black text-zinc-100">Empty Gym Floor</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Log sets freely on the fly</p>
          </div>
          <button
            type="button"
            onClick={() => void handleStartEmptyWorkout()}
            className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-emerald-500/30 shrink-0"
            title="Start Empty Workout"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </section>

        {/* Workout Routines Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-zinc-300 whitespace-nowrap">
                Workout Routines
              </h2>
              {routines.length > 0 && routines.some((r) => r.showOnHome === false) && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                  {routines.filter((r) => r.showOnHome !== false).length} Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
              <Link
                href="/routines"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0"
                title="Manage and Import Workout Routines"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>Routines Hub</span>
              </Link>
              <button
                type="button"
                onClick={handleResetRoutines}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0"
                title="Reset routines to Day 01, Day 02, Day 03"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <RoutineCardSkeleton />
              <RoutineCardSkeleton />
            </div>
          ) : routines.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl p-6">
              <p className="text-xs text-zinc-400 mb-2">No workout routines found.</p>
              <button
                type="button"
                onClick={handleResetRoutines}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold"
              >
                Restore Day 01, Day 02, Day 03
              </button>
            </div>
          ) : routines.filter((r) => r.showOnHome !== false).length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-900/30 space-y-2.5">
              <Layers className="w-7 h-7 text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-300">
                No routines selected for Home Dashboard
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                You currently have all routines hidden from the home screen. Go to Routines Hub to select which routines to display here.
              </p>
              <Link
                href="/routines"
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black"
              >
                <span>Select Routines in Hub</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {routines
                .filter((r) => r.showOnHome !== false)
                .map((routine) => {
                const isExpanded = expandedRoutineId === routine.id;
                return (
                  <div
                    key={routine.id}
                    className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-sm group"
                  >
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors">
                            {routine.name}
                          </h3>
                          <button
                            type="button"
                            className="text-zinc-500 hover:text-zinc-300 p-0.5"
                            title={isExpanded ? "Collapse exercises" : "View exercises"}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {/* Targeted Muscle Tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {routine.targetMuscles.map((muscle) => (
                            <span
                              key={muscle}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                muscle.toLowerCase() === "cardio"
                                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                          Last Run
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-400">
                          {formatLastCompleted(routine.lastCompletedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Expandable exercises preview */}
                    {isExpanded && (
                      <div className="pt-2 pb-1 border-t border-zinc-800/60 animate-in fade-in duration-150">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                          Routine Exercises ({routine.items.length})
                        </span>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {routine.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-950/60 border border-zinc-800/50"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[10px] font-mono text-zinc-500 w-4">
                                  {idx + 1}.
                                </span>
                                <span className="text-zinc-200 font-medium truncate">
                                  {item.exercise?.name || "Exercise"}
                                </span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 shrink-0 font-medium">
                                {item.exercise?.primaryMuscle || item.exercise?.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Routine Stats & Start Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                        <span>{routine.items.length} exercises</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          ~{routine.estimatedDurationMin} min
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Hide from Home Dashboard Button */}
                        <button
                          type="button"
                          onClick={(e) => handleHideFromHome(e, routine.id, routine.name)}
                          className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400 border border-zinc-800 flex items-center justify-center transition-colors"
                          title="Hide from Home Dashboard (can be re-enabled in Routines Hub)"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button if user wants to delete */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoutine(e, routine.id, routine.name)}
                          className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-zinc-800 flex items-center justify-center transition-colors"
                          title="Delete routine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStartRoutine(routine)}
                          className="px-4 py-2 min-h-[38px] rounded-xl bg-zinc-800 hover:bg-emerald-500 text-zinc-200 hover:text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                        >
                          <span>Start</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer Navigation & Brand Section */}
        <footer className="pt-8 pb-4 border-t border-zinc-900/80 space-y-3.5 text-center">
          <div className="flex items-center justify-center gap-2">
            <PulseLogo size="sm" />
            <span className="text-xs font-black tracking-wider uppercase text-zinc-200">
              PULSE <span className="text-emerald-400">GYM</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Progressive floor workout logger engineered with sports science & zero-latency offline storage.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs font-semibold text-zinc-400">
            <Link href="/services" className="hover:text-emerald-400 transition-colors">Services</Link>
            <span className="text-zinc-800">•</span>
            <Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link>
            <span className="text-zinc-800">•</span>
            <Link href="/contact" className="hover:text-emerald-400 transition-colors">Support & FAQ</Link>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono">
            PULSE Floor Engine • 100% Offline IndexedDB
          </div>
        </footer>
      </main>

      {/* Custom Routine Drawer / Modal */}
      <CreateRoutineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoutineCreated={() => void loadData()}
      />

      {/* Modern Routine Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!routineToDelete}
        title={`Delete "${routineToDelete?.name || "Routine"}"?`}
        description="Are you sure you want to delete this routine? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRoutineToDelete(null)}
      />

      {/* Modern Reset Routines Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset All Routines?"
        description="This will restore the standard Day 01, Day 02, and Day 03 routines to their default states."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
