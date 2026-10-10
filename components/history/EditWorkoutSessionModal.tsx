"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  Search,
  Dumbbell,
  Clock,
  Calendar,
  Save,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  db,
  LocalExercise,
  SessionDetailData,
  SetType,
  updateWorkoutSessionWithSets,
  EditSetInput,
  isCardioExercise,
  isBodyweightExercise,
  getLatestBodyWeightLog,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

interface EditWorkoutSessionModalProps {
  sessionData: SessionDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface WorkingSet {
  tempId: string;
  originalId?: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  setType: SetType;
  isCompleted: boolean;
}

interface WorkingGroup {
  exercise: LocalExercise;
  sets: WorkingSet[];
}

const SET_TYPES: Array<{ value: SetType; label: string; color: string }> = [
  { value: "NORMAL", label: "Normal", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  { value: "WARMUP", label: "Warmup", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { value: "DROPSET", label: "Drop", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { value: "FAILURE", label: "Failure", color: "bg-red-500/10 text-red-400 border-red-500/30" },
];

export function EditWorkoutSessionModal({
  sessionData,
  isOpen,
  onClose,
  onSaved,
}: EditWorkoutSessionModalProps) {
  const [prevSessionId, setPrevSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [showAddExerciseDrawer, setShowAddExerciseDrawer] = useState(false);
  const [allExercises, setAllExercises] = useState<LocalExercise[]>([]);
  const [searchExerciseQuery, setSearchExerciseQuery] = useState("");
  const [userBodyWeight, setUserBodyWeight] = useState(58.3);

  useEffect(() => {
    void getLatestBodyWeightLog().then((latest) => {
      if (latest?.weight) setUserBodyWeight(latest.weight);
    });
  }, []);

  // React 19 recommended pattern: adjust state when sessionData prop changes
  if (sessionData && sessionData.session.id !== prevSessionId) {
    setPrevSessionId(sessionData.session.id);
    setTitle(sessionData.session.title);

    try {
      const d = new Date(sessionData.session.startTime);
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDateTimeLocal(formatted);
    } catch {
      setDateTimeLocal("");
    }

    setDurationMinutes(Math.max(1, Math.round((sessionData.session.durationSec || 0) / 60)));

    const initialGroups: WorkingGroup[] = sessionData.exerciseGroups.map((eg) => ({
      exercise: eg.exercise,
      sets: eg.sets.map((s, idx) => ({
        tempId: s.id || `set-${eg.exercise.id}-${idx}`,
        originalId: s.id,
        setNumber: idx + 1,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
        setType: s.setType,
        isCompleted: s.isCompleted,
      })),
    }));

    setGroups(initialGroups);
    setShowAddExerciseDrawer(false);
    setSearchExerciseQuery("");
  }

  useEffect(() => {
    if (!isOpen || !sessionData) return;
    let cancelled = false;
    void db.exercises.toArray().then((list) => {
      if (!cancelled) {
        setAllExercises(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionData]);

  if (!isOpen || !sessionData) return null;

  // Handle Set Updates
  const handleUpdateSet = (
    groupIndex: number,
    setIndex: number,
    updates: Partial<WorkingSet>
  ) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const s = { ...g.sets[setIndex], ...updates };
      g.sets = [...g.sets];
      g.sets[setIndex] = s;
      next[groupIndex] = g;
      return next;
    });
  };

  const handleAddSet = (groupIndex: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const isCardio = isCardioExercise(g.exercise);
      const lastSet = g.sets[g.sets.length - 1];
      const nextNum = g.sets.length + 1;
      const newSet: WorkingSet = {
        tempId: `set-${g.exercise.id}-add-${nextNum}`,
        setNumber: nextNum,
        weight: lastSet ? lastSet.weight : (isCardio ? 1.0 : 20),
        reps: lastSet ? lastSet.reps : 10,
        rpe: lastSet ? (lastSet.rpe ?? (isCardio ? 5 : null)) : (isCardio ? 5 : null),
        setType: "NORMAL",
        isCompleted: true,
      };
      g.sets = [...g.sets, newSet];
      next[groupIndex] = g;
      return next;
    });
  };

  const handleRemoveSet = (groupIndex: number, setIndex: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const filtered = g.sets.filter((_, idx) => idx !== setIndex);
      // Renumber 1..N
      g.sets = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      next[groupIndex] = g;
      return next;
    });
  };

  const handleRemoveExercise = (groupIndex: number) => {
    setGroups((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;
    setGroups((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleAddExerciseToSession = (exercise: LocalExercise) => {
    if (groups.some((g) => g.exercise.id === exercise.id)) {
      toast.error("Exercise is already in this workout");
      return;
    }

    const isCardio = isCardioExercise(exercise);
    const isBodyweight = isBodyweightExercise(exercise);
    const defaultWeight = isCardio ? 1.0 : isBodyweight ? userBodyWeight : 20;
    const defaultSets: WorkingSet[] = [
      { tempId: `set-${exercise.id}-1`, setNumber: 1, weight: defaultWeight, reps: 10, rpe: isCardio ? 5 : null, setType: "NORMAL", isCompleted: true },
      { tempId: `set-${exercise.id}-2`, setNumber: 2, weight: defaultWeight, reps: 10, rpe: isCardio ? 5 : null, setType: "NORMAL", isCompleted: true },
      { tempId: `set-${exercise.id}-3`, setNumber: 3, weight: defaultWeight, reps: 10, rpe: isCardio ? 5 : null, setType: "NORMAL", isCompleted: true },
    ];

    setGroups((prev) => [...prev, { exercise, sets: defaultSets }]);
    setShowAddExerciseDrawer(false);
    toast.success(`Added "${exercise.name}" to workout`);
  };

  const handleLoadRoutineExercises = async () => {
    if (!sessionData?.session?.routineId) return;
    try {
      const routineItems = await db.routineItems
        .where("routineId")
        .equals(sessionData.session.routineId)
        .sortBy("orderIndex");
      if (routineItems.length === 0) {
        toast.error("No exercises found in routine template");
        return;
      }
      const exIds = routineItems.map((r) => r.exerciseId);
      const exercises = await db.exercises.where("id").anyOf(exIds).toArray();
      const exMap = new Map(exercises.map((e) => [e.id, e]));

      const loadedGroups: WorkingGroup[] = [];
      for (const item of routineItems) {
        const ex = exMap.get(item.exerciseId);
        if (!ex) continue;
        const isCardio = isCardioExercise(ex);
        const isBodyweight = isBodyweightExercise(ex);
        const count = item.targetSets || (isCardio ? 1 : 3);
        const sets: WorkingSet[] = [];
        for (let i = 1; i <= count; i++) {
          sets.push({
            tempId: `set-${ex.id}-${i}-${Date.now()}`,
            setNumber: i,
            weight: isCardio ? 1.0 : isBodyweight ? userBodyWeight : 20,
            reps: 10,
            rpe: isCardio ? 5 : null,
            setType: "NORMAL",
            isCompleted: true,
          });
        }
        loadedGroups.push({ exercise: ex, sets });
      }

      setGroups(loadedGroups);
      toast.success(`Loaded ${loadedGroups.length} exercises from routine`);
    } catch (err) {
      console.error("Failed to load routine exercises:", err);
      toast.error("Failed to load routine exercises");
    }
  };

  // Preview Totals
  const totalVolumePreview = groups.reduce((vol, g) => {
    if (isCardioExercise(g.exercise)) return vol;
    return (
      vol +
      g.sets
        .filter((s) => s.isCompleted)
        .reduce((sVol, s) => sVol + Number(s.weight || 0) * Number(s.reps || 0), 0)
    );
  }, 0);

  const totalSetsPreview = groups.reduce(
    (acc, g) => acc + g.sets.filter((s) => s.isCompleted).length,
    0
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a workout title");
      return;
    }

    if (groups.length === 0) {
      toast.error("Workout must have at least one exercise");
      return;
    }

    try {
      setIsSaving(true);

      const parsedStartTime = dateTimeLocal ? new Date(dateTimeLocal).toISOString() : sessionData.session.startTime;
      const durationSec = Math.max(60, durationMinutes * 60);

      const flatSets: EditSetInput[] = [];
      for (const g of groups) {
        for (const s of g.sets) {
          flatSets.push({
            id: s.originalId,
            exerciseId: g.exercise.id,
            setNumber: s.setNumber,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            rpe: s.rpe !== undefined ? s.rpe : null,
            setType: s.setType,
            isCompleted: s.isCompleted,
          });
        }
      }

      await updateWorkoutSessionWithSets({
        id: sessionData.session.id,
        title: title.trim(),
        startTime: parsedStartTime,
        durationSec,
        sets: flatSets,
      });

      toast.success("Workout updated successfully!");
      onSaved();
      onClose();
    } catch (err) {
      console.error("[EditWorkoutModal] Failed to save session edits:", err);
      toast.error("Failed to save changes. Please retry.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredExercises = allExercises.filter((ex) => {
    const q = searchExerciseQuery.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscle?.toLowerCase().includes(q) ||
      ex.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 tracking-tight leading-none">
                Edit Workout
              </h2>
              <span className="text-xs text-zinc-400 mt-0.5 block">
                Adjust exercises, sets, weights, and timestamps
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Top Parameters: Title, Date, Duration */}
            <div className="space-y-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
              {/* Workout Title */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                  Workout Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Leg Day, Push Hypertrophy"
                  required
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Date & Duration Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dateTimeLocal}
                    onChange={(e) => setDateTimeLocal(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>Duration (mins)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Quick Metrics Live Bar */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-850 text-center">
                <div className="bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Total Volume</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {totalVolumePreview.toLocaleString()} kg
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Completed Sets</span>
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {totalSetsPreview} sets
                  </span>
                </div>
              </div>
            </div>

            {/* Exercise Groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Exercises & Sets ({groups.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddExerciseDrawer(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exercise</span>
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
                    <Dumbbell className="w-5 h-5 text-emerald-400/60" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-300">No exercises logged for this workout</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Add exercises or load from template routine to start editing sets.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddExerciseDrawer(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Add Exercise</span>
                    </button>
                    {sessionData?.session?.routineId && (
                      <button
                        type="button"
                        onClick={() => void handleLoadRoutineExercises()}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Load Routine Exercises</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                groups.map((group, groupIdx) => {
                const isCardio = isCardioExercise(group.exercise);

                return (
                  <div
                    key={group.exercise.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-3"
                  >
                    {/* Exercise Card Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-zinc-100">
                          {group.exercise.name}
                        </h4>
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

                      {/* Header Actions: Reorder & Delete */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(groupIdx, "up")}
                            disabled={groupIdx === 0}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                            title="Move exercise up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(groupIdx, "down")}
                            disabled={groupIdx === groups.length - 1}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                            title="Move exercise down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(groupIdx)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove exercise from workout"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sets Table */}
                    <div className="space-y-1.5">
                      {isCardio ? (
                        <div className="grid grid-cols-[22px_64px_1fr_1fr_1fr_32px_26px] gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/80 px-1 items-center">
                          <span>#</span>
                          <span>Type</span>
                          <span className="text-center">Time (m)</span>
                          <span className="text-center">Dist (km)</span>
                          <span className="text-center text-purple-400">Resist</span>
                          <span className="text-center">Done</span>
                          <span className="text-center">Del</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[24px_68px_1fr_1fr_36px_28px] gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-1 items-center">
                          <span>#</span>
                          <span>Type</span>
                          <span className="text-center">Weight</span>
                          <span className="text-center">Reps</span>
                          <span className="text-center">Done</span>
                          <span className="text-center">Del</span>
                        </div>
                      )}

                      {group.sets.map((set, setIdx) => (
                        <div
                          key={set.tempId}
                          className={`grid ${
                            isCardio
                              ? "grid-cols-[22px_64px_1fr_1fr_1fr_32px_26px]"
                              : "grid-cols-[24px_68px_1fr_1fr_36px_28px]"
                          } gap-1 items-center p-1.5 rounded-xl border text-xs ${
                            set.isCompleted
                              ? "bg-zinc-900/80 border-zinc-800 text-zinc-100"
                              : "bg-zinc-900/30 border-zinc-850/60 text-zinc-500"
                          }`}
                        >
                          {/* Set # */}
                          <span className="font-bold font-mono text-[11px] text-zinc-400 text-center">
                            {set.setNumber}
                          </span>

                          {/* Set Type Pill Button (Replaces cramped select) */}
                          <button
                            type="button"
                            onClick={() => {
                              const types: SetType[] = ["NORMAL", "WARMUP", "DROPSET", "FAILURE"];
                              const nextIdx = (types.indexOf(set.setType) + 1) % types.length;
                              handleUpdateSet(groupIdx, setIdx, { setType: types[nextIdx] });
                            }}
                            className={`h-7 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center justify-center transition-all ${
                              set.setType === "WARMUP"
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                : set.setType === "DROPSET"
                                ? "bg-purple-500/15 border-purple-500/40 text-purple-400"
                                : set.setType === "FAILURE"
                                ? "bg-red-500/15 border-red-500/40 text-red-400"
                                : "bg-zinc-800 border-zinc-700 text-zinc-300"
                            }`}
                            title={`Type: ${set.setType}. Tap to cycle.`}
                          >
                            <span>
                              {set.setType === "NORMAL"
                                ? "Norm"
                                : set.setType === "WARMUP"
                                ? "Warm"
                                : set.setType === "DROPSET"
                                ? "Drop"
                                : "Fail"}
                            </span>
                          </button>

                          {isCardio ? (
                            <>
                              {/* Time Input (reps) */}
                              <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={set.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      reps: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-bold text-cyan-300 focus:outline-none text-right"
                                  placeholder="10"
                                />
                                <span className="text-[9px] text-zinc-500 ml-0.5">m</span>
                              </div>

                              {/* Distance Input (weight) */}
                              <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={set.weight}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      weight: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-bold text-emerald-300 focus:outline-none text-right"
                                  placeholder="1.0"
                                />
                                <span className="text-[9px] text-zinc-500 ml-0.5">k</span>
                              </div>

                              {/* Resistance Input (rpe) */}
                              <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={set.rpe ?? 1}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      rpe: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-bold text-purple-300 focus:outline-none text-right"
                                  placeholder="1"
                                />
                                <span className="text-[9px] text-zinc-500 ml-0.5">L</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Weight Input */}
                              <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={set.weight}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      weight: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-bold text-zinc-100 focus:outline-none text-right"
                                />
                                <span className="text-[10px] text-zinc-500 ml-0.5">kg</span>
                                {isBodyweightExercise(group.exercise) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSet(groupIdx, setIdx, {
                                        weight: Math.abs(set.weight - userBodyWeight) < 0.1 ? 0 : userBodyWeight,
                                      })
                                    }
                                    title={`Toggle Body Weight (${userBodyWeight}kg)`}
                                    className={`text-[8px] font-black px-1 py-0.5 rounded ml-1 transition-colors shrink-0 ${
                                      Math.abs(set.weight - userBodyWeight) < 0.1
                                        ? "bg-emerald-500 text-zinc-950 font-black"
                                        : "bg-zinc-800 text-zinc-400 hover:text-emerald-400"
                                    }`}
                                  >
                                    BW
                                  </button>
                                )}
                              </div>

                              {/* Reps Input */}
                              <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={set.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      reps: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-bold text-zinc-100 focus:outline-none text-right"
                                />
                                <span className="text-[10px] text-zinc-500 ml-0.5">r</span>
                              </div>
                            </>
                          )}

                          {/* Completed Checkbox */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSet(groupIdx, setIdx, {
                                isCompleted: !set.isCompleted,
                              })
                            }
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center border transition-all ${
                              set.isCompleted
                                ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-sm"
                                : "bg-zinc-800 border-zinc-700 text-zinc-600 hover:text-zinc-400"
                            }`}
                            title="Toggle completed"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          {/* Delete Set */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(groupIdx, setIdx)}
                            className="w-6 h-7 mx-auto rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                            title="Delete set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Set Button */}
                    <button
                      type="button"
                      onClick={() => handleAddSet(groupIdx)}
                      className="w-full py-1.5 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Set</span>
                    </button>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-3 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Changes..." : "Save Workout Changes"}</span>
            </button>
          </div>
        </form>

        {/* Add Exercise Drawer Overlay */}
        {showAddExerciseDrawer && (
          <div className="absolute inset-0 bg-zinc-950 z-30 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-zinc-100">Add Movement to Workout</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExerciseDrawer(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search exercises to add..."
                  value={searchExerciseQuery}
                  onChange={(e) => setSearchExerciseQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredExercises.slice(0, 50).map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleAddExerciseToSession(ex)}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <h5 className="font-bold text-xs text-zinc-200 group-hover:text-emerald-300">
                      {ex.name}
                    </h5>
                    <span className="text-[10px] text-zinc-500">
                      {ex.category} • {ex.primaryMuscle}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
