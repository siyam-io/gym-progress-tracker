"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Dumbbell,
  Trophy,
  Trash2,
  RotateCcw,
  Pencil,
} from "lucide-react";
import {
  getSessionDetail,
  deleteWorkoutSession,
  SessionDetailData,
  SetType,
  isCardioExercise,
  isBodyweightExercise,
} from "@/lib/db/dexie";
import { calculate1RM } from "@/lib/utils/pr-calculator";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { toast } from "@/stores/useToastStore";
import { EditWorkoutSessionModal } from "./EditWorkoutSessionModal";

interface SessionDetailModalProps {
  sessionId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: () => void;
}

export function SessionDetailModal({
  sessionId,
  onClose,
  onDeleted,
  onUpdated,
}: SessionDetailModalProps) {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();
  const [data, setData] = useState<SessionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const res = await getSessionDetail(id);
      setData(res);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getSessionDetail(sessionId).then((res) => {
      if (!cancelled) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) return null;

  const confirmDelete = async () => {
    if (!data) return;

    try {
      setIsDeleting(true);
      await deleteWorkoutSession(data.session.id);
      toast.success(`"${data.session.title}" deleted from history`);
      onDeleted();
      onClose();
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast.error("Failed to delete session");
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
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-zinc-100 truncate max-w-[200px] sm:max-w-[230px]">
                  {data ? data.session.title : "Workout Details"}
                </h2>
                {data && (
                  <span className="text-[10px] text-zinc-400 block font-mono">
                    {formatDateTime(data.session.startTime)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-emerald-400 flex items-center justify-center transition-colors"
                title="Edit workout details and sets"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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

                {data.exerciseGroups.map((group) => {
                  const isCardio = isCardioExercise(group.exercise);

                  return (
                    <div
                      key={group.exercise.id}
                      className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                        <div>
                          <h3 className="font-bold text-xs text-zinc-200">{group.exercise.name}</h3>
                          <span className="text-[10px] text-zinc-500">
                            {isCardio ? (
                              <span className="text-cyan-400 font-semibold">Cardio Movement</span>
                            ) : (
                              <>
                                {group.exercise.category} •{" "}
                                <span className="text-emerald-400">{group.exercise.primaryMuscle}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {group.sets.length} sets
                        </span>
                      </div>

                      {/* Sets Table */}
                      <div className="space-y-1.5">
                        {isCardio ? (
                          <div className="grid grid-cols-[30px_60px_1fr_60px_36px] gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/80 px-1">
                            <span>Round</span>
                            <span>Type</span>
                            <span>Time • Dist • Resist</span>
                            <span className="text-right">Pace</span>
                            <span className="text-center">PR</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-[30px_60px_1fr_60px_36px] gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                            <span>Set</span>
                            <span>Type</span>
                            <span>Weight × Reps</span>
                            <span className="text-right">e1RM</span>
                            <span className="text-center">PR</span>
                          </div>
                        )}

                        {group.sets.map((s) => {
                          const badge = setTypeBadges[s.setType] || setTypeBadges.NORMAL;
                          const e1rm = calculate1RM(s.weight, s.reps);
                          const pace =
                            s.weight > 0 && s.reps > 0
                              ? `${(s.reps / s.weight).toFixed(1)}m/k`
                              : "—";

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

                              {isCardio ? (
                                <span className="font-semibold text-zinc-100 truncate text-[11px]">
                                  {s.reps}m • {s.weight}km{s.rpe ? ` • L${s.rpe}` : ""}
                                </span>
                              ) : (
                                <span className="font-semibold text-zinc-100">
                                  {isBodyweightExercise(group.exercise) && s.weight === 0
                                    ? "BW"
                                    : `${s.weight}kg`}{" "}
                                  × {s.reps}
                                </span>
                              )}

                              <span className="text-right font-medium text-emerald-400">
                                {isCardio ? pace : `${e1rm}kg`}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          {data && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              {showConfirmDelete ? (
                <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                    <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Permanently delete this workout from your logbook?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmDelete()}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete Session"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={isDeleting}
                    className="py-3 px-3.5 min-h-[48px] rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-950/60 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
                    title="Delete workout session"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="py-3 px-3.5 min-h-[48px] rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
                    title="Edit workout title, exercises, weights, and reps"
                  >
                    <Pencil className="w-4 h-4 text-emerald-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRerun}
                    className="flex-1 py-3 px-3 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span className="truncate">Re-run as Template</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Workout Session Modal */}
      {showEditModal && data && (
        <EditWorkoutSessionModal
          sessionData={data}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            if (sessionId) {
              loadDetail(sessionId);
            }
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}
