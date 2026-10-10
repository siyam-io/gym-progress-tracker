"use client";

import React, { useState } from "react";
import { Check, Trash2, ChevronDown, Minus, Plus, Timer, MapPin, Activity } from "lucide-react";
import { LocalSetLog } from "@/lib/db/dexie";
import { SetType } from "@/types/workout";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

interface CardioSetRowProps {
  exerciseId: string;
  exerciseName?: string;
  setLog: LocalSetLog;
  ghostData?: { weight: number; reps: number; rpe?: number | null };
  onDelete?: () => void;
}

export function CardioSetRow({
  exerciseId,
  setLog,
  ghostData,
}: CardioSetRowProps) {
  const { updateSet, toggleSetCompleted, removeSet } = useWorkoutStore();
  const [showSteppers, setShowSteppers] = useState(false);

  // Time in minutes is stored in setLog.reps (default 10)
  // Distance in km is stored in setLog.weight (default 1.0)
  // Resistance / Level / Incline is stored in setLog.rpe (default 1)
  const durationMins = setLog.reps || 10;
  const distanceKm = setLog.weight || 1.0;
  const resistanceLevel = setLog.rpe !== null && setLog.rpe !== undefined ? setLog.rpe : 1;

  const handleTimeDelta = (delta: number) => {
    const nextTime = Math.max(1, durationMins + delta);
    void updateSet(exerciseId, setLog.id, { reps: nextTime });
  };

  const setDuration = (mins: number) => {
    void updateSet(exerciseId, setLog.id, { reps: Math.max(1, mins) });
  };

  const handleDistanceDelta = (delta: number) => {
    const nextDist = Math.max(0, Math.round((distanceKm + delta) * 10) / 10);
    void updateSet(exerciseId, setLog.id, { weight: nextDist });
  };

  const setDistance = (dist: number) => {
    void updateSet(exerciseId, setLog.id, { weight: Math.max(0, dist) });
  };

  const handleResistanceDelta = (delta: number) => {
    const nextRes = Math.max(0, Math.round((resistanceLevel + delta) * 10) / 10);
    void updateSet(exerciseId, setLog.id, { rpe: nextRes });
  };

  const setResistance = (res: number) => {
    void updateSet(exerciseId, setLog.id, { rpe: Math.max(0, res) });
  };

  const handleSetTypeChange = (type: SetType) => {
    void updateSet(exerciseId, setLog.id, { setType: type });
  };

  const setTypeLabels: Record<SetType, { label: string; bg: string; text: string }> = {
    NORMAL: { label: `${setLog.setNumber}`, bg: "bg-cyan-500/10 border-cyan-500/30", text: "text-cyan-400" },
    WARMUP: { label: "W", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" },
    DROPSET: { label: "I", bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400" },
    FAILURE: { label: "MAX", bg: "bg-red-500/10 border-red-500/30", text: "text-red-400" },
  };

  const currentBadge = setLog.isCompleted
    ? { label: `${setLog.setNumber}`, bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-400" }
    : (setTypeLabels[setLog.setType as SetType] || setTypeLabels.NORMAL);

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 border overflow-hidden ${
        setLog.isCompleted
          ? "bg-emerald-950/25 border-emerald-500/30"
          : "bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/80"
      }`}
    >
      {/* Cardio Set Row Main Grid - Strict Single-Line Alignment */}
      <div className="grid grid-cols-[26px_44px_1fr_1fr_1fr_24px_32px_20px] sm:grid-cols-[30px_52px_1fr_1fr_1fr_28px_36px_24px] gap-1 sm:gap-1.5 items-center px-1 sm:px-2 py-1.5 sm:py-2 min-h-[44px] sm:min-h-[48px]">
        {/* 1. Interval / Round Index */}
        <button
          type="button"
          onClick={() => setShowSteppers((prev) => !prev)}
          className={`w-6.5 sm:w-7.5 h-7 sm:h-8 min-w-[26px] sm:min-w-[30px] rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs border transition-colors ${currentBadge.bg} ${currentBadge.text}`}
          title="Toggle Quick Steppers & Phase"
        >
          {currentBadge.label}
        </button>

        {/* 2. Ghost History Indicator for Cardio */}
        <div
          className="text-center truncate px-0.5"
          title={ghostData ? `${ghostData.reps}m • ${ghostData.weight}km • L${ghostData.rpe || 1}` : "No previous data"}
        >
          <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 font-semibold">
            {ghostData ? `${ghostData.reps}m•${ghostData.weight}k` : "—"}
          </span>
        </div>

        {/* 3. Duration / Minutes Input */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-cyan-500 rounded-lg px-0.5 sm:px-1 h-8 sm:h-9 transition-colors min-w-0">
          <input
            type="number"
            inputMode="numeric"
            value={durationMins || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              void updateSet(exerciseId, setLog.id, { reps: isNaN(val) ? 0 : Math.max(0, val) });
            }}
            className="w-full text-center bg-transparent font-mono font-bold text-[11px] sm:text-sm text-cyan-200 placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="10"
          />
        </div>

        {/* 4. Distance / Km Input */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500 rounded-lg px-0.5 sm:px-1 h-8 sm:h-9 transition-colors min-w-0">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={distanceKm || ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              void updateSet(exerciseId, setLog.id, { weight: isNaN(val) ? 0 : Math.max(0, val) });
            }}
            className="w-full text-center bg-transparent font-mono font-bold text-[11px] sm:text-sm text-emerald-200 placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="1.0"
          />
        </div>

        {/* 5. Resistance / Level Input */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-purple-500 rounded-lg px-0.5 sm:px-1 h-8 sm:h-9 transition-colors min-w-0">
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={resistanceLevel ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              void updateSet(exerciseId, setLog.id, { rpe: isNaN(val) ? 0 : Math.max(0, val) });
            }}
            className="w-full text-center bg-transparent font-mono font-bold text-[11px] sm:text-sm text-purple-200 placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="1"
          />
        </div>

        {/* 6. Quick Stepper Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSteppers((prev) => !prev)}
          className={`w-6 h-7 sm:w-7 sm:h-8 rounded-lg flex items-center justify-center border transition-colors ${
            showSteppers
              ? "bg-zinc-800 border-zinc-600 text-zinc-200"
              : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-200"
          }`}
          title="Toggle Quick Steppers"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              showSteppers ? "rotate-180 text-cyan-400" : ""
            }`}
          />
        </button>

        {/* 7. Completed Checkmark Toggle */}
        <button
          type="button"
          onClick={() => void toggleSetCompleted(exerciseId, setLog.id)}
          className={`w-8 h-7 sm:w-9 sm:h-8 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${
            setLog.isCompleted
              ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 font-bold"
              : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          }`}
          title={setLog.isCompleted ? "Completed" : "Mark Set Done"}
        >
          <Check className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${setLog.isCompleted ? "stroke-[3]" : "stroke-[2]"}`} />
        </button>

        {/* 8. Delete Set Button */}
        <button
          type="button"
          onClick={() => void removeSet(exerciseId, setLog.id)}
          className="w-5 h-7 sm:w-6 sm:h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-colors"
          title="Delete this set"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Adjust Stepper Drawer */}
      {showSteppers && (
        <div className="p-3 bg-zinc-950/85 border-t border-zinc-800/60 flex flex-col gap-3 animate-in fade-in-50 duration-150">
          {/* 1. Quick Duration (Time) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Timer className="w-3.5 h-3.5" />
                Quick Duration
              </span>
              <span className="font-mono text-cyan-300 font-bold">{durationMins} mins</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleTimeDelta(-5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 5m
              </button>
              <button
                type="button"
                onClick={() => handleTimeDelta(-1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 1m
              </button>
              <button
                type="button"
                onClick={() => handleTimeDelta(1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 1m
              </button>
              <button
                type="button"
                onClick={() => handleTimeDelta(5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 5m
              </button>
            </div>
            {/* Direct Time Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {[5, 10, 15, 20, 30, 45].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDuration(preset)}
                  className={`px-2.5 py-1 min-h-[32px] rounded text-xs font-mono font-semibold transition-colors shrink-0 ${
                    durationMins === preset
                      ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quick Distance Adjustments */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                Quick Distance
              </span>
              <span className="font-mono text-emerald-300 font-bold">{distanceKm} km</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleDistanceDelta(-1.0)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 1.0
              </button>
              <button
                type="button"
                onClick={() => handleDistanceDelta(-0.5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 0.5
              </button>
              <button
                type="button"
                onClick={() => handleDistanceDelta(0.5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 0.5
              </button>
              <button
                type="button"
                onClick={() => handleDistanceDelta(1.0)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 1.0
              </button>
            </div>
            {/* Direct Distance Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {[1, 2, 3, 5, 8, 10].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDistance(preset)}
                  className={`px-2.5 py-1 min-h-[32px] rounded text-xs font-mono font-semibold transition-colors shrink-0 ${
                    distanceKm === preset
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {preset}km
                </button>
              ))}
            </div>
          </div>

          {/* 3. Quick Resistance / Incline / Level Adjustments */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Activity className="w-3.5 h-3.5" />
                Resistance / Level / Incline
              </span>
              <span className="font-mono text-purple-300 font-bold">L{resistanceLevel}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleResistanceDelta(-5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 5
              </button>
              <button
                type="button"
                onClick={() => handleResistanceDelta(-1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 1
              </button>
              <button
                type="button"
                onClick={() => handleResistanceDelta(1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-purple-400" /> 1
              </button>
              <button
                type="button"
                onClick={() => handleResistanceDelta(5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-purple-400" /> 5
              </button>
            </div>
            {/* Direct Level Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {[1, 2, 4, 6, 8, 10, 12, 15].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setResistance(preset)}
                  className={`px-2.5 py-1 min-h-[32px] rounded text-xs font-mono font-semibold transition-colors shrink-0 ${
                    resistanceLevel === preset
                      ? "bg-purple-500 text-zinc-950 font-bold shadow-sm"
                      : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  L{preset}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Cardio Type / Phase */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400">Cardio Phase / Type</span>
              <div className="flex items-center gap-1">
                {(["NORMAL", "WARMUP", "DROPSET", "FAILURE"] as SetType[]).map((type) => {
                  const typeNames: Record<SetType, string> = {
                    NORMAL: "Steady",
                    WARMUP: "Warm",
                    DROPSET: "HIIT",
                    FAILURE: "Max",
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSetTypeChange(type)}
                      className={`px-2 py-1 min-h-[36px] rounded text-[11px] font-semibold transition-colors ${
                        setLog.setType === type
                          ? "bg-cyan-500 text-zinc-950 font-bold"
                          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {typeNames[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

