"use client";

import React, { useEffect } from "react";
import { Timer, X, Plus, Minus, BellRing } from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

export function RestTimerBar() {
  const { restTimer, adjustRestTimer, stopRestTimer, tickRestTimer } = useWorkoutStore();

  // Drift-Free interval runner
  useEffect(() => {
    if (!restTimer.isRunning) return;

    // Tick immediately to sync accurately
    tickRestTimer();

    // High frequency 250ms check against targetEndTime
    const interval = setInterval(() => {
      tickRestTimer();
    }, 250);

    return () => clearInterval(interval);
  }, [restTimer.isRunning, tickRestTimer]);

  if (!restTimer.isRunning) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const percentLeft = Math.max(
    0,
    Math.min(100, (restTimer.remainingSec / restTimer.totalDurationSec) * 100)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 shadow-2xl transition-transform animate-in slide-in-from-bottom duration-200">
      <div className="max-w-md mx-auto flex flex-col gap-2">
        {/* Progress Bar Track */}
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-300 ease-linear rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            style={{ width: `${percentLeft}%` }}
          />
        </div>

        {/* Content & Action Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Timer Display */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 min-w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                Rest Timer
                {restTimer.exerciseName && (
                  <span className="text-zinc-500 truncate max-w-[120px]">
                    • {restTimer.exerciseName}
                  </span>
                )}
              </span>
              <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
                {formatTime(restTimer.remainingSec)}
              </span>
            </div>
          </div>

          {/* Quick Adjust Steppers & Skip Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustRestTimer(-15)}
              className="h-10 min-w-[44px] px-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold active:bg-zinc-700 flex items-center justify-center transition-colors"
              title="Minus 15 seconds"
            >
              <Minus className="w-3 h-3 mr-0.5 text-zinc-400" />
              15s
            </button>

            <button
              type="button"
              onClick={() => adjustRestTimer(30)}
              className="h-10 min-w-[44px] px-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-emerald-400 text-xs font-bold active:bg-zinc-700 flex items-center justify-center transition-colors"
              title="Add 30 seconds"
            >
              <Plus className="w-3 h-3 mr-0.5 text-emerald-400" />
              30s
            </button>

            <button
              type="button"
              onClick={stopRestTimer}
              className="h-10 w-10 min-w-[44px] rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-red-950/40 hover:border-red-500/40 text-zinc-400 hover:text-red-400 flex items-center justify-center active:scale-95 transition-all"
              title="Skip Rest Timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
