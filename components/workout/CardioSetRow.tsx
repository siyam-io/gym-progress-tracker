"use client";

import React, { useState } from "react";
import { Check, Timer, MapPin, Plus, Minus, Flame, Heart, Trash2 } from "lucide-react";
import { LocalSetLog } from "@/lib/db/dexie";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

interface CardioSetRowProps {
  exerciseId: string;
  exerciseName: string;
  setLog: LocalSetLog;
  ghostData?: { weight: number; reps: number };
  onDelete?: () => void;
}

export function CardioSetRow({
  exerciseId,
  exerciseName: _exerciseName,
  setLog,
  ghostData,
}: CardioSetRowProps) {
  const { updateSet, toggleSetCompleted, removeSet } = useWorkoutStore();
  const [showSteppers, setShowSteppers] = useState(false);

  // Time in minutes is stored in setLog.reps (default 10)
  // Distance in km is stored in setLog.weight (default 1.0)
  const durationMins = setLog.reps || 10;
  const distanceKm = setLog.weight || 1.0;

  const handleTimeDelta = (delta: number) => {
    const nextTime = Math.max(1, durationMins + delta);
    void updateSet(exerciseId, setLog.id, { reps: nextTime });
  };

  const handleDistanceDelta = (delta: number) => {
    const nextDist = Math.max(0, Math.round((distanceKm + delta) * 10) / 10);
    void updateSet(exerciseId, setLog.id, { weight: nextDist });
  };

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 border overflow-hidden ${
        setLog.isCompleted
          ? "bg-emerald-950/25 border-emerald-500/30"
          : "bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/80"
      }`}
    >
      {/* Cardio Set Row Main Header & Inputs */}
      <div className="flex items-center justify-between p-3.5 gap-2.5">
        {/* Interval / Round Index */}
        <button
          type="button"
          onClick={() => setShowSteppers((prev) => !prev)}
          className={`w-9 h-9 min-w-9 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors ${
            setLog.isCompleted
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          }`}
          title="Toggle Quick Steppers"
        >
          {setLog.setNumber}
        </button>

        {/* Ghost History Indicator for Cardio */}
        <div className="flex flex-col min-w-[70px] text-left">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1">
            <Heart className="w-2.5 h-2.5 text-rose-400/80" />
            Prev
          </span>
          <span className="text-xs font-mono text-zinc-400 font-semibold truncate">
            {ghostData ? `${ghostData.reps}m • ${ghostData.weight}km` : "—"}
          </span>
        </div>

        {/* Duration / Minutes Input */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1">
            <Timer className="w-3 h-3 text-cyan-400" />
            Time (m)
          </span>
          <div className="flex items-center gap-1 mt-1 w-full justify-center">
            <input
              type="number"
              inputMode="numeric"
              value={durationMins || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                void updateSet(exerciseId, setLog.id, { reps: isNaN(val) ? 0 : Math.max(0, val) });
              }}
              className="w-14 h-9 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-center font-mono font-bold text-sm text-zinc-100"
              placeholder="10"
            />
          </div>
        </div>

        {/* Distance / Km Input */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            Dist (km)
          </span>
          <div className="flex items-center gap-1 mt-1 w-full justify-center">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={distanceKm || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                void updateSet(exerciseId, setLog.id, { weight: isNaN(val) ? 0 : Math.max(0, val) });
              }}
              className="w-14 h-9 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-center font-mono font-bold text-sm text-zinc-100"
              placeholder="1.0"
            />
          </div>
        </div>

        {/* Actions: Complete & Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void toggleSetCompleted(exerciseId, setLog.id)}
            className={`w-10 h-10 min-w-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
              setLog.isCompleted
                ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20"
                : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            }`}
            title={setLog.isCompleted ? "Completed" : "Mark Set Done"}
          >
            <Check className={`w-5 h-5 ${setLog.isCompleted ? "stroke-[3]" : "stroke-[2]"}`} />
          </button>

          <button
            type="button"
            onClick={() => void removeSet(exerciseId, setLog.id)}
            className="w-8 h-10 min-w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-colors"
            title="Delete this set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Adjust Stepper Drawer */}
      {showSteppers && (
        <div className="px-3.5 pb-3 pt-1 border-t border-zinc-800/70 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2">
          {/* Time Steppers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">Time:</span>
            <button
              type="button"
              onClick={() => handleTimeDelta(-5)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-mono font-bold text-zinc-300"
            >
              -5m
            </button>
            <button
              type="button"
              onClick={() => handleTimeDelta(-1)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-mono font-bold text-zinc-300"
            >
              -1m
            </button>
            <button
              type="button"
              onClick={() => handleTimeDelta(1)}
              className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-600 rounded-md text-xs font-mono font-bold text-cyan-300"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => handleTimeDelta(5)}
              className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-600 rounded-md text-xs font-mono font-bold text-cyan-300"
            >
              +5m
            </button>
          </div>

          {/* Distance Steppers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">Dist:</span>
            <button
              type="button"
              onClick={() => handleDistanceDelta(-0.5)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-mono font-bold text-zinc-300"
            >
              -0.5
            </button>
            <button
              type="button"
              onClick={() => handleDistanceDelta(0.5)}
              className="px-2 py-1 bg-emerald-950/40 border border-emerald-800/60 hover:border-emerald-600 rounded-md text-xs font-mono font-bold text-emerald-300"
            >
              +0.5
            </button>
            <button
              type="button"
              onClick={() => handleDistanceDelta(1.0)}
              className="px-2 py-1 bg-emerald-950/40 border border-emerald-800/60 hover:border-emerald-600 rounded-md text-xs font-mono font-bold text-emerald-300"
            >
              +1.0
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
