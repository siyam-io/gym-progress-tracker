"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Disc3, Plus, Minus, RotateCcw } from "lucide-react";

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
}

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  25: { bg: "bg-red-600", text: "text-white", border: "border-red-400" },
  20: { bg: "bg-blue-600", text: "text-white", border: "border-blue-400" },
  15: { bg: "bg-amber-500", text: "text-zinc-950", border: "border-amber-300" },
  10: { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-400" },
  5: { bg: "bg-zinc-200", text: "text-zinc-950", border: "border-zinc-400" },
  2.5: { bg: "bg-zinc-800", text: "text-zinc-100", border: "border-zinc-600" },
  1.25: { bg: "bg-zinc-900", text: "text-zinc-400", border: "border-zinc-700" },
};

export function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight = 60,
}: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight > 0 ? initialWeight : 60);
  const [barWeight, setBarWeight] = useState<number>(20); // 20kg standard Olympic bar

  const calculation = useMemo(() => {
    if (targetWeight <= barWeight) {
      return {
        platesPerSide: [] as { plate: number; count: number }[],
        weightPerSide: 0,
        achievedWeight: barWeight,
        remainder: 0,
      };
    }

    let neededPerSide = (targetWeight - barWeight) / 2;
    const platesPerSide: { plate: number; count: number }[] = [];

    for (const plate of KG_PLATES) {
      if (neededPerSide >= plate) {
        const count = Math.floor(neededPerSide / plate);
        if (count > 0) {
          platesPerSide.push({ plate, count });
          neededPerSide -= count * plate;
        }
      }
    }

    const achievedPerSide = platesPerSide.reduce((sum, p) => sum + p.plate * p.count, 0);
    const achievedWeight = barWeight + achievedPerSide * 2;
    const remainder = Math.round((targetWeight - achievedWeight) * 10) / 10;

    return {
      platesPerSide,
      weightPerSide: achievedPerSide,
      achievedWeight,
      remainder,
    };
  }, [targetWeight, barWeight]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const adjustWeight = (delta: number) => {
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + delta) * 10) / 10));
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Disc3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100">Barbell Plate Calculator</h2>
              <span className="text-[10px] text-zinc-500 font-mono">Per side loading</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Weight Controls */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-center space-y-3">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
            Target Barbell Weight
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-black font-mono text-zinc-100 tracking-tight">
              {targetWeight}
            </span>
            <span className="text-sm font-bold text-zinc-500">kg</span>
          </div>

          {/* Quick Adjustment Steppers */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => adjustWeight(-10)}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold font-mono transition-colors active:scale-95"
            >
              -10kg
            </button>
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold font-mono transition-colors active:scale-95"
            >
              -2.5kg
            </button>
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 text-xs font-bold font-mono transition-colors active:scale-95"
            >
              +2.5kg
            </button>
            <button
              type="button"
              onClick={() => adjustWeight(10)}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 text-xs font-bold font-mono transition-colors active:scale-95"
            >
              +10kg
            </button>
          </div>
        </div>

        {/* Bar Weight Selector */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-zinc-400 font-semibold">Barbell Weight:</span>
          <div className="flex gap-1.5">
            {[20, 15, 10].map((bw) => (
              <button
                key={bw}
                type="button"
                onClick={() => setBarWeight(bw)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  barWeight === bw
                    ? "bg-emerald-500 text-zinc-950 shadow-sm"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {bw}kg {bw === 20 ? "(Std)" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Barbell Loading Diagram */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300">Each Side Load</span>
            <span className="font-mono text-emerald-400 font-bold">
              {calculation.weightPerSide} kg / side
            </span>
          </div>

          {calculation.platesPerSide.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Barbell only (no plates needed)
            </p>
          ) : (
            <div className="space-y-2">
              {/* Stack illustration */}
              <div className="flex items-center gap-1.5 py-2 overflow-x-auto justify-center">
                {/* Bar Sleeve */}
                <div className="w-4 h-12 bg-zinc-700 rounded-l-md border-r-2 border-zinc-900 shrink-0" />

                {/* Plates rendered from heaviest to lightest */}
                {calculation.platesPerSide.flatMap((p) =>
                  Array.from({ length: p.count }).map((_, i) => {
                    const color = PLATE_COLORS[p.plate] || {
                      bg: "bg-zinc-700",
                      text: "text-white",
                      border: "border-zinc-500",
                    };
                    const heightClass =
                      p.plate >= 20 ? "h-14 w-6" : p.plate >= 10 ? "h-11 w-5" : "h-8 w-4";

                    return (
                      <div
                        key={`${p.plate}-${i}`}
                        className={`${heightClass} ${color.bg} ${color.border} border rounded-md flex items-center justify-center shrink-0 shadow-md`}
                        title={`${p.plate} kg`}
                      >
                        <span className={`text-[9px] font-black font-mono rotate-90 ${color.text}`}>
                          {p.plate}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Plate count summary list */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-xs">
                {calculation.platesPerSide.map((p) => (
                  <div
                    key={p.plate}
                    className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800"
                  >
                    <span className="font-mono font-bold text-zinc-200">{p.plate} kg</span>
                    <span className="font-mono text-emerald-400 font-black">× {p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {calculation.remainder > 0 && (
            <div className="text-[11px] text-amber-400 font-semibold text-center pt-1">
              ⚠️ Note: +{calculation.remainder}kg difference with standard plates
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
