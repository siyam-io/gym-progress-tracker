"use client";

import React from "react";
import { X, Dumbbell, ShieldCheck, Zap, Info } from "lucide-react";
import Image from "next/image";
import { LocalExercise } from "@/lib/db/dexie";

interface AnatomicalFormModalProps {
  exercise: LocalExercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnatomicalFormModal({ exercise, isOpen, onClose }: AnatomicalFormModalProps) {
  React.useEffect(() => {
    if (!isOpen || !exercise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, exercise, onClose]);

  if (!isOpen || !exercise) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Drawer header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-zinc-100 tracking-tight">
                Anatomical Form & Technique
              </h2>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {exercise.category} • {exercise.primaryMuscle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Diagram / Image Container */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner">
          {exercise.imageUrl ? (
            <Image
              src={exercise.imageUrl}
              alt={exercise.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
              <Dumbbell className="w-12 h-12 text-emerald-500/40" />
              <span className="text-xs font-mono font-bold text-zinc-500">
                Movement Diagram
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />

          {/* Exercise title overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <span className="text-base font-black text-zinc-100 drop-shadow-md">
              {exercise.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider">
              Targeted
            </span>
          </div>
        </div>

        {/* Active Muscle Highlights */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Muscle Activation</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              Primary: {exercise.primaryMuscle}
            </span>
            {exercise.secondaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className="px-2 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>

        {/* Form & Biomechanics Points */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Execution Cue & Range of Motion</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Start Position
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Brace core, retract scapula, and stabilize grip with stacked wrists.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Finish Position
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Full contraction at peak range without hyperextension or momentum.
              </p>
            </div>
          </div>
        </div>

        {/* Close CTA */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs active:scale-95 transition-all"
        >
          Close Diagram
        </button>
      </div>
    </div>
  );
}
