"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Dumbbell,
  Plus,
  CheckCircle2,
  Wifi,
  WifiOff,
  Trash2,
  Trophy,
  Disc3,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { initializeLocalDb, processSyncQueue, LocalExercise, isCardioExercise, isBodyweightExercise } from "@/lib/db/dexie";
import { LiveSetRow } from "@/components/workout/LiveSetRow";
import { CardioSetRow } from "@/components/workout/CardioSetRow";
import { RestTimerBar } from "@/components/workout/RestTimerBar";
import { AddExerciseModal } from "@/components/workout/AddExerciseModal";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { AnatomicalFormModal } from "@/components/exercises/AnatomicalFormModal";
import { PlateCalculatorModal } from "@/components/workout/PlateCalculatorModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/stores/useToastStore";
import { formatDuration } from "@/lib/utils/date";

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const {
    session,
    exerciseGroups,
    workoutElapsedSec,
    isLoading,
    initializeOrRestore,
    incrementWorkoutElapsed,
    finishWorkout,
    discardWorkout,
    addSet,
    removeExercise,
    moveExercise,
  } = useWorkoutStore();

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
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

  // Auto-redirect to home if no active session and not showing completed summary
  useEffect(() => {
    if (!isLoading && !session && !completedSummary) {
      router.replace("/");
    }
  }, [isLoading, session, completedSummary, router]);

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

  const handleShareSummary = async () => {
    if (!completedSummary) return;
    const summaryText = `🏋️ PULSE GYM WORKOUT: ${completedSummary.title}\n⏱️ Time: ${formatDuration(completedSummary.durationSec)}\n💪 Volume: ${completedSummary.totalVolume.toLocaleString()} kg\n🏆 PRs: ${completedSummary.prCount}\nTracked with PULSE Gym`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(summaryText);
        toast.success("Workout summary copied to clipboard! 📋");
      } catch {
        toast.error("Failed to copy summary to clipboard.");
      }
    }
  };

  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const handleConfirmDiscard = async () => {
    setShowDiscardModal(false);
    await discardWorkout();
    router.replace("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Dumbbell className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Gym Floor...</p>
      </div>
    );
  }

  // If no active session, show completed summary modal if finished, or redirect state
  if (!session) {
    if (showSummaryModal && completedSummary) {
      return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4">
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

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleShareSummary}
                className="flex-1 py-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  router.replace("/history");
                }}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </main>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Dumbbell className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Returning to Home...</p>
      </div>
    );
  }

  // Active Live Workout Interface
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between pb-32 w-full max-w-md mx-auto overflow-x-hidden min-w-0">
      {/* Sticky Gym Floor Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-emerald-400 active:scale-95 transition-colors"
            title="Minimize to Dashboard"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowDiscardModal(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 active:scale-95 transition-colors"
            title="Discard Workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-100 leading-tight truncate">
              {session.title}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs">
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-emerald-400" />
                {formatDuration(workoutElapsedSec)}
              </span>
              <span className="text-zinc-600">•</span>
              <span
                className={`font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                  isOnline ? "text-emerald-500" : "text-amber-400"
                }`}
              >
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                <span>{isOnline ? "Online" : "Local"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPlateCalculator(true)}
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 flex items-center justify-center transition-colors shadow-sm"
            title="Barbell Plate Calculator"
          >
            <Disc3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Finish</span>
          </button>
        </div>
      </header>

      {/* Main Exercise Cards List */}
      <main className="p-3 sm:p-4 space-y-4 sm:space-y-5 flex-1 w-full min-w-0">
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
          exerciseGroups.map((group, exGroupIdx) => {
            const isCardio = isCardioExercise(group.exercise);

            return (
              <section
                key={group.exercise.id}
                className={`border rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 shadow-md transition-all overflow-hidden ${
                  isCardio
                    ? "bg-zinc-900/70 border-cyan-900/40 hover:border-cyan-700/50"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700/80"
                }`}
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 gap-2">
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
                      <span className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                        {isCardio ? (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[10px]">
                            Cardio Movement
                          </span>
                        ) : (
                          <>
                            {group.exercise.category} •{" "}
                            <span className="text-emerald-400">{group.exercise.primaryMuscle}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Header Actions: Reorder Movement Earlier/Later & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => void moveExercise(group.exercise.id, "up")}
                        disabled={exGroupIdx === 0}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 disabled:opacity-20 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-all"
                        title="Move movement earlier (swap with above)"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveExercise(group.exercise.id, "down")}
                        disabled={exGroupIdx === exerciseGroups.length - 1}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 disabled:opacity-20 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-all"
                        title="Move movement later (swap with below)"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
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
                </div>

                {/* Sets Header Labels - 100% Matching Grid Template with Rows */}
                {isCardio ? (
                  <div className="grid grid-cols-[26px_44px_1fr_1fr_1fr_24px_32px_20px] sm:grid-cols-[30px_52px_1fr_1fr_1fr_28px_36px_24px] gap-1 sm:gap-1.5 items-center px-1 sm:px-2 py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-cyan-400/80">
                    <span className="text-center">Rnd</span>
                    <span className="text-center">Prev</span>
                    <span className="text-center">Time</span>
                    <span className="text-center">Dist</span>
                    <span className="text-center text-purple-400">Resist</span>
                    <span className="text-center">Step</span>
                    <span className="text-center">Done</span>
                    <span></span>
                  </div>
                ) : (
                  <div className="grid grid-cols-[28px_48px_1fr_1fr_24px_34px_22px] sm:grid-cols-[32px_56px_1fr_1fr_28px_36px_24px] gap-1 sm:gap-2 items-center px-1 sm:px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="text-center">Set</span>
                    <span className="text-center">Prev</span>
                    <span className="text-center">Weight</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Step</span>
                    <span className="text-center">Done</span>
                    <span></span>
                  </div>
                )}

                {/* Set Rows */}
                <div className="space-y-2">
                  {group.sets.map((setLog) => {
                    const ghost = group.ghostSets.find((g) => g.setNumber === setLog.setNumber);
                    if (isCardio) {
                      return (
                        <CardioSetRow
                          key={setLog.id}
                          exerciseId={group.exercise.id}
                          exerciseName={group.exercise.name}
                          setLog={setLog}
                          ghostData={ghost}
                        />
                      );
                    }
                    return (
                      <LiveSetRow
                        key={setLog.id}
                        exerciseId={group.exercise.id}
                        exerciseName={group.exercise.name}
                        setLog={setLog}
                        ghostData={ghost}
                        isBodyweight={isBodyweightExercise(group.exercise)}
                      />
                    );
                  })}
                </div>

                {/* Add Set Button */}
                <button
                  type="button"
                  onClick={() => void addSet(group.exercise.id, "NORMAL")}
                  className={`w-full py-2.5 min-h-[44px] rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    isCardio
                      ? "bg-zinc-950/80 border-cyan-900/40 hover:bg-cyan-950/20 text-cyan-300"
                      : "bg-zinc-950/80 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 ${isCardio ? "text-cyan-400" : "text-emerald-400"}`} />
                  <span>{isCardio ? "Add Cardio Round" : "Add Set"}</span>
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

      {/* Barbell Plate Calculator Drawer */}
      <PlateCalculatorModal
        isOpen={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
      />

      {/* Modern Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardModal}
        title="Discard Workout?"
        description="Are you sure you want to discard this workout? All progress will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Going"
        variant="danger"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />
    </div>
  );
}
