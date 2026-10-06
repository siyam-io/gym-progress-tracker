"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar,
  Clock,
  Dumbbell,
  Trophy,
  Flame,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  getSessionDetail,
  deleteWorkoutSession,
  SessionDetailData,
  LocalSetLog,
  SetType,
} from "@/lib/db/dexie";
import { calculate1RM } from "@/lib/utils/pr-calculator";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

interface SessionDetailModalProps {
  sessionId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function SessionDetailModal({
  sessionId,
  onClose,
  onDeleted,
}: SessionDetailModalProps) {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();
  const [data, setData] = useState<SessionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    void getSessionDetail(sessionId).then((res) => {
      setData(res);
      setIsLoading(false);
    });
  }, [sessionId]);

  if (!sessionId) return null;

  const handleDelete = async () => {
    if (!data) return;
    const confirmed = window.confirm(
      `Delete "${data.session.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteWorkoutSession(data.session.id);
      onDeleted();
      onClose();
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRerun = async () => {
    if (!data) return;
    const exercises = data.exerciseGroups.map((g) => g.exercise);
    await startWorkout(data.session.title, exercises, data.session.routineId ?? undefined);
    onClose();
    router.push("/workout/active");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const setTypeBadges: Record<SetType, { label: string; color: string }> = {
    NORMAL: { label: "Normal", color: "bg-zinc-800 text-zinc-300" },
    WARMUP: { label: "Warmup", color: "bg-amber-500/10 text-amber-400 border border-amber-500/30" },
    DROPSET: { label: "Drop", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30" },
    FAILURE: { label: "Failure", color: "bg-red-500/10 text-red-400 border border-red-500/30" },
  };

  const totalSets = data
    ? data.exerciseGroups.reduce(
        (acc, g) => acc + g.sets.filter((s) => s.isCompleted).length,
        0
      )
    : 0;

  const totalPRs = data
    ? data.exerciseGroups.reduce(
        (acc, g) => acc + g.sets.filter((s) => s.isCompleted && s.isPR).length,
        0
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100 truncate max-w-[240px]">
                {data ? data.session.title : "Workout Details"}
              </h2>
              {data && (
                <span className="text-[10px] text-zinc-400 block font-mono">
                  {formatDateTime(data.session.startTime)}
                </span>
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

        {/* Content Body */}
        {isLoading || !data ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Loading session breakdown...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Time</span>
                <span className="text-xs font-mono font-bold text-zinc-200">
                  {formatDuration(data.session.durationSec)}
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Volume</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {data.session.totalVolume} kg
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Sets</span>
                <span className="text-xs font-mono font-bold text-zinc-200">
                  {totalSets}
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">PRs</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {totalPRs}
                </span>
              </div>
            </div>

            {/* Exercise Logs */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 block">
                Exercise Breakdown ({data.exerciseGroups.length})
              </span>

              {data.exerciseGroups.map((group) => (
                <div
                  key={group.exercise.id}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                    <div>
                      <h3 className="font-bold text-xs text-zinc-200">{group.exercise.name}</h3>
                      <span className="text-[10px] text-zinc-500">
                        {group.exercise.category} •{" "}
                        <span className="text-emerald-400">{group.exercise.primaryMuscle}</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {group.sets.length} sets
                    </span>
                  </div>

                  {/* Sets Table */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[30px_60px_1fr_60px_36px] gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                      <span>Set</span>
                      <span>Type</span>
                      <span>Weight × Reps</span>
                      <span className="text-right">e1RM</span>
                      <span className="text-center">PR</span>
                    </div>

                    {group.sets.map((s) => {
                      const badge = setTypeBadges[s.setType] || setTypeBadges.NORMAL;
                      const e1rm = calculate1RM(s.weight, s.reps);

                      return (
                        <div
                          key={s.id}
                          className={`grid grid-cols-[30px_60px_1fr_60px_36px] gap-1 items-center px-2 py-1.5 rounded-lg text-xs font-mono ${
                            s.isPR
                              ? "bg-amber-500/10 border border-amber-500/20 text-zinc-200"
                              : "bg-zinc-900/60 text-zinc-300"
                          }`}
                        >
                          <span className="text-zinc-500 font-bold">{s.setNumber}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold text-center ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-semibold text-zinc-100">
                            {s.weight}kg × {s.reps}
                          </span>
                          <span className="text-right font-medium text-emerald-400">
                            {e1rm}kg
                          </span>
                          <span className="flex items-center justify-center">
                            {s.isPR ? (
                              <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        {data && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="py-3 px-4 min-h-[48px] rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-950/60 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={handleRerun}
              className="flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-run as Template</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
