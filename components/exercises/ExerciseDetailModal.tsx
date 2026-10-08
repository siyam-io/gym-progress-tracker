"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Dumbbell,
  Trophy,
  Clock,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  getExerciseDetailHistory,
  ExerciseDetailHistory,
  LocalExercise,
  SetType,
} from "@/lib/db/dexie";
import { analyzeProgressiveOverload } from "@/lib/utils/progressive-overload";
import { ExerciseThumbnail } from "./ExerciseThumbnail";

interface ExerciseDetailModalProps {
  exerciseId: string | null;
  exercise?: LocalExercise | null;
  onClose: () => void;
}

export function ExerciseDetailModal({ exerciseId, exercise, onClose }: ExerciseDetailModalProps) {
  const [data, setData] = useState<ExerciseDetailHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const targetId = exerciseId || exercise?.id;
    if (!targetId) return;

    let cancelled = false;
    getExerciseDetailHistory(targetId, exercise || undefined)
      .then((res) => {
        if (!cancelled && res) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load exercise history:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId, exercise]);

  const overloadAnalysis = useMemo(() => {
    if (!data || data.sessions.length === 0) return null;
    const allSets = data.sessions.flatMap((s) => s.sets);
    return analyzeProgressiveOverload(allSets);
  }, [data]);

  useEffect(() => {
    if (!exerciseId && !exercise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exerciseId, exercise, onClose]);

  if (!exerciseId && !exercise) return null;

  const setTypeBadges: Record<SetType, { label: string; color: string }> = {
    NORMAL: { label: "N", color: "bg-zinc-800 text-zinc-300" },
    WARMUP: { label: "W", color: "bg-amber-500/10 text-amber-400 border border-amber-500/30" },
    DROPSET: { label: "D", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30" },
    FAILURE: { label: "F", color: "bg-red-500/10 text-red-400 border border-red-500/30" },
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100 truncate max-w-[220px]">
                {data ? data.exercise.name : exercise ? exercise.name : "Exercise Details"}
              </h2>
              {(data || exercise) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-zinc-400 font-semibold">
                    {data?.exercise.category || exercise?.category}
                  </span>
                  <span className="text-zinc-600 text-[10px]">•</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {data?.exercise.primaryMuscle || exercise?.primaryMuscle}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isLoading && !data ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading exercise stats and history...</span>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
            <Dumbbell className="w-8 h-8 text-zinc-600 mb-1" />
            <p className="font-semibold text-zinc-400">Exercise details not found</p>
            <p className="text-[11px] text-zinc-600">The requested movement is not in the active database.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Movement Illustration Hero */}
            <div className="space-y-1.5">
              <ExerciseThumbnail
                imageUrl={data.exercise.imageUrl}
                name={data.exercise.name}
                size="hero"
                className="w-full h-44 rounded-2xl shadow-lg border border-zinc-800"
              />
            </div>

            {/* Lifetime Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Sets</span>
                <span className="text-xs font-mono font-bold text-zinc-200">
                  {data.totalSets}
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Max Wt</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {data.maxWeight} kg
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Max Reps</span>
                <span className="text-xs font-mono font-bold text-zinc-200">
                  {data.maxReps}
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Est 1RM</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {data.highest1RM} kg
                </span>
              </div>
            </div>

            {/* Progressive Overload Intelligent Advisor */}
            {overloadAnalysis && (
              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  overloadAnalysis.status === "PROGRESSING"
                    ? "bg-emerald-950/25 border-emerald-500/40 text-emerald-300"
                    : overloadAnalysis.status === "PLATEAU"
                    ? "bg-amber-950/25 border-amber-500/40 text-amber-300"
                    : overloadAnalysis.status === "DELOAD"
                    ? "bg-blue-950/25 border-blue-500/40 text-blue-300"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  {overloadAnalysis.status === "PROGRESSING" && (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {overloadAnalysis.status === "PLATEAU" && (
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {overloadAnalysis.status === "DELOAD" && (
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  {overloadAnalysis.status === "NEW" && (
                    <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{overloadAnalysis.headline}</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {overloadAnalysis.recommendation}
                </p>
              </div>
            )}

            {/* 1RM Progression Mini Sparkline */}
            {data.progression.length > 1 && (
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    1RM Progression Sparkline
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    Peak: {data.highest1RM} kg
                  </span>
                </div>

                {/* SVG Sparkline */}
                {(() => {
                  const min = Math.min(...data.progression.map((p) => p.e1rm));
                  const max = Math.max(...data.progression.map((p) => p.e1rm));
                  const range = max - min > 0 ? max - min : 10;
                  const width = 300;
                  const height = 70;
                  const padding = 10;

                  const points = data.progression.map((p, idx) => {
                    const x =
                      padding +
                      (idx / (data.progression.length - 1)) * (width - 2 * padding);
                    const y =
                      height -
                      padding -
                      ((p.e1rm - min) / range) * (height - 2 * padding);
                    return { x, y };
                  });

                  const pathD = points.reduce((acc, p, idx) => {
                    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, "");

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-18 overflow-visible">
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          className="fill-zinc-950 stroke-emerald-400 stroke-2"
                        />
                      ))}
                    </svg>
                  );
                })()}
              </div>
            )}

            {/* Reverse Chronological Session History */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 block">
                Session History ({data.sessions.length})
              </span>

              {data.sessions.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  No completed sets recorded for this movement yet.
                </div>
              ) : (
                data.sessions.map((sess) => (
                  <div
                    key={sess.sessionId}
                    className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                      <div>
                        <h3 className="font-bold text-xs text-zinc-200">{sess.sessionTitle}</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatDate(sess.dateStr)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {sess.sets.length} sets
                      </span>
                    </div>

                    {/* Sets list */}
                    <div className="space-y-1">
                      <div className="grid grid-cols-[24px_30px_1fr_60px_30px] gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                        <span>#</span>
                        <span>Type</span>
                        <span>Weight × Reps</span>
                        <span className="text-right">e1RM</span>
                        <span className="text-center">PR</span>
                      </div>

                      {sess.sets.map((s) => {
                        const badge = setTypeBadges[s.setType] || setTypeBadges.NORMAL;
                        return (
                          <div
                            key={s.id}
                            className={`grid grid-cols-[24px_30px_1fr_60px_30px] gap-1 items-center px-2 py-1 rounded-lg text-xs font-mono ${
                              s.isPR
                                ? "bg-amber-500/10 border border-amber-500/20 text-zinc-200"
                                : "bg-zinc-900/60 text-zinc-300"
                            }`}
                          >
                            <span className="text-zinc-500 font-bold">{s.setNumber}</span>
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-sans font-bold text-center ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                            <span className="font-semibold text-zinc-100">
                              {s.weight}kg × {s.reps}
                            </span>
                            <span className="text-right font-medium text-emerald-400">
                              {s.e1rm}kg
                            </span>
                            <span className="flex items-center justify-center">
                              {s.isPR ? (
                                <Trophy className="w-3 h-3 text-amber-400 fill-amber-400" />
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Action */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>Close Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
