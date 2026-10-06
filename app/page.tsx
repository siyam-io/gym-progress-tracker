"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Play,
  Plus,
  Flame,
  Clock,
  ChevronRight,
  Layers,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import {
  initializeLocalDb,
  getRoutinesWithExercises,
  getWeeklyWorkoutStreak,
  RoutineWithExercises,
  StreakDay,
} from "@/lib/db/dexie";
import { CreateRoutineModal } from "@/components/routine/CreateRoutineModal";
import { AuthButton } from "@/components/auth/AuthButton";
import { DailyWeightCard } from "@/components/weight/DailyWeightCard";

export default function HomeDashboard() {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();

  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [streakData, setStreakData] = useState<{ days: StreakDay[]; completedCount: number }>({
    days: [],
    completedCount: 0,
  });
  const [greeting, setGreeting] = useState("Welcome back");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await initializeLocalDb();
      const [fetchedRoutines, streak] = await Promise.all([
        getRoutinesWithExercises(),
        getWeeklyWorkoutStreak(),
      ]);
      setRoutines(fetchedRoutines);
      setStreakData(streak);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    // Set contextual greeting based on local time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, [loadData]);

  const handleStartEmpty = async () => {
    await startWorkout("Quick Workout", []);
    router.push("/workout/active");
  };

  const handleStartRoutine = async (routine: RoutineWithExercises) => {
    const exercises = routine.items.map((i) => i.exercise);
    await startWorkout(routine.name, exercises, routine.id);
    router.push("/workout/active");
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
      {/* Top Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-zinc-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-[1.5px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100 leading-none">
              PULSE GYM
            </h1>
            <span className="text-[11px] text-zinc-400 font-semibold mt-0.5 block">
              {greeting}, Athlete
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-emerald-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{streakData.completedCount}</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="p-5 space-y-5 flex-1">
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
            {streakData.days.map((day) => (
              <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-zinc-500">
                  {day.dayName}
                </span>
                <div
                  className={`w-9 h-9 min-w-9 rounded-xl flex items-center justify-center transition-all ${
                    day.isCompleted
                      ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/25"
                      : day.isToday
                      ? "bg-zinc-900 border-2 border-emerald-500/60 text-zinc-300"
                      : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-600"
                  }`}
                  title={`${day.fullDay} (${day.dateStr})`}
                >
                  {day.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span className="text-xs font-mono font-bold">
                      {new Date(day.dateStr).getDate()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Body Weight Tracker Widget */}
        <DailyWeightCard />

        {/* Quick Start Action Button */}
        <section>
          <button
            type="button"
            onClick={handleStartEmpty}
            className="w-full py-4 min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all group"
          >
            <Play className="w-5 h-5 fill-zinc-950 transition-transform group-hover:scale-110" />
            <span>Start Empty Workout</span>
          </button>
        </section>

        {/* Workout Routines Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300">
                Gym Workout Routines
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 min-h-[36px] px-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Routine</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Loading routines...
            </div>
          ) : routines.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl p-6">
              <p className="text-xs text-zinc-400 mb-2">No workout routines found.</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold"
              >
                Create your first routine
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors">
                        {routine.name}
                      </h3>
                      {/* Targeted Muscle Tags */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {routine.targetMuscles.map((muscle) => (
                          <span
                            key={muscle}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                        Last Run
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-400">
                        {formatLastCompleted(routine.lastCompletedAt)}
                      </span>
                    </div>
                  </div>

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

                    <button
                      type="button"
                      onClick={() => void handleStartRoutine(routine)}
                      className="px-4 py-2 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-emerald-500 text-zinc-200 hover:text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <span>Start</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Custom Routine Drawer / Modal */}
      <CreateRoutineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoutineCreated={() => void loadData()}
      />
    </div>
  );
}
