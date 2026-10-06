"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Dumbbell,
  Plus,
  CheckCircle2,
  Wifi,
  WifiOff,
  Trash2,
  Trophy,
  Flame,
} from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { initializeLocalDb, DEFAULT_EXERCISES, processSyncQueue, LocalExercise } from "@/lib/db/dexie";
import { LiveSetRow } from "@/components/workout/LiveSetRow";
import { RestTimerBar } from "@/components/workout/RestTimerBar";
import { AddExerciseModal } from "@/components/workout/AddExerciseModal";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { AnatomicalFormModal } from "@/components/exercises/AnatomicalFormModal";

export default function ActiveWorkoutPage() {
  const {
    session,
    exerciseGroups,
    workoutElapsedSec,
    isLoading,
    initializeOrRestore,
    startWorkout,
    incrementWorkoutElapsed,
    finishWorkout,
    discardWorkout,
    addSet,
    removeExercise,
  } = useWorkoutStore();

  const [isOnline, setIsOnline] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [anatomicalModalExercise, setAnatomicalModalExercise] = useState<LocalExercise | null>(null);
  const [completedSummary, setCompletedSummary] = useState<{
    title: string;
    durationSec: number;
    totalVolume: number;
    completedSetsCount: number;
    prCount: number;
  } | null>(null);

  // Initialize Dexie seed & restore session
  useEffect(() => {
    void initializeLocalDb().then(() => {
      void initializeOrRestore();
    });

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [initializeOrRestore]);

  // Workout duration timer
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      incrementWorkoutElapsed();
    }, 1000);
    return () => clearInterval(interval);
  }, [session, incrementWorkoutElapsed]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartDefaultWorkout = () => {
    const day1ExIds = [
      "ex-push-up",
      "ex-incline-press",
      "ex-barbell-bench-press",
      "ex-pec-deck-fly",
      "ex-cable-tricep-pushdown",
      "ex-crunches",
      "ex-plank",
    ];
    const initialEx = DEFAULT_EXERCISES.filter((e) => day1ExIds.includes(e.id));
    void startWorkout("Day #01 - Push & Core", initialEx.length > 0 ? initialEx : DEFAULT_EXERCISES.slice(0, 5));
  };

  const handleFinish = async () => {
    if (!session) return;

    // Tally stats
    let completedSetsCount = 0;
    let prCount = 0;
    for (const g of exerciseGroups) {
      for (const s of g.sets) {
        if (s.isCompleted) {
          completedSetsCount++;
          if (s.isPR) prCount++;
        }
      }
    }

    const currentTitle = session.title;
    const currentElapsed = workoutElapsedSec;
    const currentVolume = exerciseGroups.reduce(
      (acc, g) =>
        acc +
        g.sets
          .filter((s) => s.isCompleted)
          .reduce((sAcc, s) => sAcc + s.weight * s.reps, 0),
      0
    );

    await finishWorkout();

    setCompletedSummary({
      title: currentTitle,
      durationSec: currentElapsed,
      totalVolume: Math.round(currentVolume),
      completedSetsCount,
      prCount,
    });
    setShowSummaryModal(true);

    // Trigger sync
    void processSyncQueue();
  };

  const handleDiscard = async () => {
    if (window.confirm("Are you sure you want to discard this workout? All progress will be lost.")) {
      await discardWorkout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Dumbbell className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Gym Floor...</p>
      </div>
    );
  }

  // If no active session, show Start Workout gym hub
  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 max-w-md mx-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between py-2 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-zinc-100">PULSE GYM</h1>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Offline-First Tracker
              </span>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isOnline
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? "Online" : "Offline DB"}</span>
          </div>
        </header>

        {/* Hero Card */}
        <div className="my-auto py-8 flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/10">
              <Flame className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider">
              Zero Latency
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight">
              Ready for the Floor?
            </h2>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Real-time Brzycki PR engine, ghost placeholders, one-thumb quick steppers, and drift-free rest timer.
            </p>
          </div>

          <div className="w-full space-y-3 pt-2">
            <button
              type="button"
              onClick={handleStartDefaultWorkout}
              className="w-full py-4 min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
            >
              <Dumbbell className="w-5 h-5 fill-zinc-950" />
              <span>Start Day #01 Session</span>
            </button>

            <button
              type="button"
              onClick={() => void startWorkout("Custom Workout", [])}
              className="w-full py-3.5 min-h-[48px] rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm border border-zinc-800 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Start Blank Workout</span>
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <footer className="grid grid-cols-3 gap-2 py-4 border-t border-zinc-900 text-center">
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Rest Timer</span>
            <span className="text-xs font-bold text-emerald-400">Drift-Free</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">PR Formula</span>
            <span className="text-xs font-bold text-amber-400">Brzycki 1RM</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Offline Store</span>
            <span className="text-xs font-bold text-blue-400">Dexie Sync</span>
          </div>
        </footer>

        {/* Workout Complete Summary Modal */}
        {showSummaryModal && completedSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="w-8 h-8 fill-emerald-400/20" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-100">Workout Complete!</h3>
                <p className="text-xs text-zinc-400 mt-1">{completedSummary.title}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full py-2">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Time</span>
                  <span className="text-sm font-mono font-bold text-zinc-100">
                    {formatDuration(completedSummary.durationSec)}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Volume</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {completedSummary.totalVolume} kg
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">PRs</span>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {completedSummary.prCount}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  // Active Live Workout Interface
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between pb-32 max-w-md mx-auto">
      {/* Sticky Gym Floor Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="w-9 h-9 min-w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 active:scale-95 transition-colors"
            title="Discard Workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100 leading-none">
              {session.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                {formatDuration(workoutElapsedSec)}
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isOnline ? "text-emerald-500" : "text-amber-400"
                }`}
              >
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {isOnline ? "Online" : "Local Sync"}
              </span>
            </div>
          </div>
        </div>

        {/* Finish Workout CTA */}
        <button
          type="button"
          onClick={handleFinish}
          className="h-10 min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Finish</span>
        </button>
      </header>

      {/* Main Exercise Cards List */}
      <main className="p-4 space-y-5 flex-1">
        {exerciseGroups.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl p-6 flex flex-col items-center gap-3">
            <Dumbbell className="w-10 h-10 text-zinc-600" />
            <div>
              <p className="font-bold text-zinc-300 text-base">No exercises added yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Tap the button below to add your first movement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          </div>
        ) : (
          exerciseGroups.map((group) => {
            return (
              <section
                key={group.exercise.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-3 shadow-md"
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ExerciseThumbnail
                      imageUrl={group.exercise.imageUrl}
                      name={group.exercise.name}
                      size="sm"
                      onClick={() => setAnatomicalModalExercise(group.exercise)}
                      className="cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-zinc-100 truncate">
                        {group.exercise.name}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        {group.exercise.category} •{" "}
                        <span className="text-emerald-400">{group.exercise.primaryMuscle}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeExercise(group.exercise.id)}
                    className="w-8 h-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0"
                    title="Remove Exercise"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sets Header Labels */}
                <div className="grid grid-cols-[36px_70px_1fr_1fr_36px_44px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <span>Set</span>
                  <span>Prev</span>
                  <span className="text-center">kg</span>
                  <span className="text-center">Reps</span>
                  <span className="text-center">Step</span>
                  <span className="text-center">Done</span>
                </div>

                {/* Set Rows */}
                <div className="space-y-2">
                  {group.sets.map((setLog) => {
                    const ghost = group.ghostSets.find((g) => g.setNumber === setLog.setNumber);
                    return (
                      <LiveSetRow
                        key={setLog.id}
                        exerciseId={group.exercise.id}
                        exerciseName={group.exercise.name}
                        setLog={setLog}
                        ghostData={ghost}
                      />
                    );
                  })}
                </div>

                {/* Add Set Button */}
                <button
                  type="button"
                  onClick={() => void addSet(group.exercise.id, "NORMAL")}
                  className="w-full py-2.5 min-h-[44px] rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 active:bg-zinc-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Set</span>
                </button>
              </section>
            );
          })
        )}

        {/* Add Exercise Floating Trigger */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full py-3.5 min-h-[48px] rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Exercise</span>
        </button>
      </main>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Persistent Drift-Free Rest Timer Bar */}
      <RestTimerBar />

      {/* Full-screen Anatomical Form Drawer */}
      <AnatomicalFormModal
        exercise={anatomicalModalExercise}
        isOpen={!!anatomicalModalExercise}
        onClose={() => setAnatomicalModalExercise(null)}
      />
    </div>
  );
}
