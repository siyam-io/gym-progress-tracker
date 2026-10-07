"use client";

import React, { useState } from "react";
import { Check, Flame, Trophy, Minus, Plus, ChevronDown, Trash2 } from "lucide-react";
import { LocalSetLog, SetType } from "@/lib/db/dexie";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

interface LiveSetRowProps {
  exerciseId: string;
  exerciseName: string;
  setLog: LocalSetLog;
  ghostData?: { weight: number; reps: number };
  onDelete?: () => void;
}

export function LiveSetRow({
  exerciseId,
  exerciseName: _exerciseName,
  setLog,
  ghostData,
}: LiveSetRowProps) {
  const { updateSet, toggleSetCompleted, removeSet } = useWorkoutStore();
  const [showStepperDrawer, setShowStepperDrawer] = useState(false);

  const handleWeightDelta = (delta: number) => {
    const nextWeight = Math.max(0, Math.round((setLog.weight + delta) * 10) / 10);
    void updateSet(exerciseId, setLog.id, { weight: nextWeight });
  };

  const handleRepsDelta = (delta: number) => {
    const nextReps = Math.max(0, setLog.reps + delta);
    void updateSet(exerciseId, setLog.id, { reps: nextReps });
  };

  const handleSetTypeChange = (type: SetType) => {
    void updateSet(exerciseId, setLog.id, { setType: type });
  };

  const setTypeLabels: Record<SetType, { label: string; bg: string; text: string }> = {
    NORMAL: { label: `${setLog.setNumber}`, bg: "bg-zinc-800", text: "text-zinc-200" },
    WARMUP: { label: "W", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" },
    DROPSET: { label: "D", bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400" },
    FAILURE: { label: "F", bg: "bg-red-500/10 border-red-500/30", text: "text-red-400" },
  };

  const currentBadge = setTypeLabels[setLog.setType];

  return (
    <div
      className={`relative rounded-xl transition-all duration-200 ${
        setLog.isCompleted
          ? "bg-emerald-950/20 border border-emerald-500/25"
          : "bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700"
      }`}
    >
      {/* PR Glow Banner if flagged as PR */}
      {setLog.isPR && setLog.isCompleted && (
        <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 animate-pulse">
          <Trophy className="w-3 h-3 fill-zinc-950" />
          <span>New Personal Record</span>
        </div>
      )}

      {/* Main Set Row Grid */}
      <div className="flex items-center justify-between p-3 gap-2 min-h-[58px]">
        {/* Set Number & Type Trigger */}
        <button
          type="button"
          onClick={() => setShowStepperDrawer((prev) => !prev)}
          className={`w-9 h-9 min-w-9 rounded-lg flex items-center justify-center font-bold text-xs border transition-colors ${currentBadge.bg} ${currentBadge.text}`}
          title="Change Set Type & Adjustments"
        >
          {currentBadge.label}
        </button>

        {/* Ghost History Indicator */}
        <div className="flex flex-col min-w-[70px] text-left">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
            Previous
          </span>
          <span className="text-xs font-mono font-medium text-zinc-400">
            {ghostData ? `${ghostData.weight}kg × ${ghostData.reps}` : "—"}
          </span>
        </div>

        {/* Weight Interactive Box */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-0.5">
            Weight (kg)
          </span>
          <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg px-2 py-1 w-full max-w-[90px] justify-between focus-within:border-emerald-500">
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={setLog.weight === 0 ? "" : setLog.weight}
              placeholder={ghostData ? `${ghostData.weight}` : "0"}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                void updateSet(exerciseId, setLog.id, { weight: isNaN(val) ? 0 : val });
              }}
              className="w-full text-center bg-transparent text-sm font-semibold text-zinc-100 placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Reps Interactive Box */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-0.5">
            Reps
          </span>
          <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg px-2 py-1 w-full max-w-[80px] justify-between focus-within:border-emerald-500">
            <input
              type="number"
              inputMode="numeric"
              value={setLog.reps === 0 ? "" : setLog.reps}
              placeholder={ghostData ? `${ghostData.reps}` : "0"}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                void updateSet(exerciseId, setLog.id, { reps: isNaN(val) ? 0 : val });
              }}
              className="w-full text-center bg-transparent text-sm font-semibold text-zinc-100 placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Quick Stepper Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => setShowStepperDrawer((prev) => !prev)}
          className={`w-9 h-9 min-w-9 rounded-lg flex items-center justify-center border transition-colors ${
            showStepperDrawer
              ? "bg-zinc-800 border-zinc-600 text-zinc-200"
              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
          title="Quick Steppers for Gym Floor"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showStepperDrawer ? "rotate-180 text-emerald-400" : ""
            }`}
          />
        </button>

        {/* Completed Checkmark Toggle (Touch-friendly 44x44px target) */}
        <button
          type="button"
          onClick={() => void toggleSetCompleted(exerciseId, setLog.id)}
          className={`w-11 h-11 min-w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
            setLog.isCompleted
              ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30 scale-100"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/60"
          }`}
          title={setLog.isCompleted ? "Set Completed" : "Mark Set Complete"}
        >
          <Check
            className={`w-5 h-5 stroke-[3] transition-transform ${
              setLog.isCompleted ? "scale-110" : ""
            }`}
          />
        </button>

        {/* Delete Set Button */}
        <button
          type="button"
          onClick={() => void removeSet(exerciseId, setLog.id)}
          className="w-8 h-11 min-w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-colors"
          title="Delete this set"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* One-Thumb Gym Quick-Stepper Drawer / Bottom Sheet */}
      {showStepperDrawer && (
        <div className="p-3 pt-1 border-t border-zinc-800/80 bg-zinc-950/70 rounded-b-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick Weight Adjustments (Thumb Friendly) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
              <span>Quick Weight (kg)</span>
              <span className="font-mono text-emerald-400">{setLog.weight} kg</span>
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleWeightDelta(-5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 5
              </button>
              <button
                type="button"
                onClick={() => handleWeightDelta(-2.5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 2.5
              </button>
              <button
                type="button"
                onClick={() => handleWeightDelta(2.5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 2.5
              </button>
              <button
                type="button"
                onClick={() => handleWeightDelta(5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 5
              </button>
            </div>
          </div>

          {/* Quick Reps Adjustments */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
              <span>Quick Reps</span>
              <span className="font-mono text-emerald-400">{setLog.reps} reps</span>
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleRepsDelta(-5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 5
              </button>
              <button
                type="button"
                onClick={() => handleRepsDelta(-1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Minus className="w-3 h-3 text-red-400" /> 1
              </button>
              <button
                type="button"
                onClick={() => handleRepsDelta(1)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 1
              </button>
              <button
                type="button"
                onClick={() => handleRepsDelta(5)}
                className="h-10 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:bg-zinc-700 flex items-center justify-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> 5
              </button>
            </div>
          </div>

          {/* Set Type & RPE Selection */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400">Set Type</span>
              <div className="flex items-center gap-1">
                {(["NORMAL", "WARMUP", "DROPSET", "FAILURE"] as SetType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSetTypeChange(type)}
                    className={`px-2 py-1 min-h-[36px] rounded text-[11px] font-semibold transition-colors ${
                      setLog.setType === type
                        ? "bg-emerald-500 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {type.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>

            {/* RPE Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                RPE (Intensity)
              </span>
              <div className="flex items-center gap-1">
                {[7, 8, 8.5, 9, 9.5, 10].map((rpeVal) => (
                  <button
                    key={rpeVal}
                    type="button"
                    onClick={() => void updateSet(exerciseId, setLog.id, { rpe: rpeVal })}
                    className={`px-2 py-1 min-h-[36px] rounded text-[11px] font-mono font-bold transition-colors ${
                      setLog.rpe === rpeVal
                        ? "bg-amber-500 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {rpeVal}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
