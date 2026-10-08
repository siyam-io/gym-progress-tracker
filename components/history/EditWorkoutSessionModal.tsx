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
  Layers,
  Save,
  Activity,
  AlertCircle,
} from "lucide-react";
import {
  db,
  LocalExercise,
  SessionDetailData,
  SetType,
  updateWorkoutSessionWithSets,
  EditSetInput,
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
  const [title, setTitle] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Exercise picker drawer state
  const [showAddExerciseDrawer, setShowAddExerciseDrawer] = useState(false);
  const [allExercises, setAllExercises] = useState<LocalExercise[]>([]);
  const [searchExerciseQuery, setSearchExerciseQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !sessionData) return;

    setTitle(sessionData.session.title);

    // Format ISO string to YYYY-MM-DDTHH:mm for datetime-local input
    try {
      const d = new Date(sessionData.session.startTime);
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDateTimeLocal(formatted);
    } catch {
      setDateTimeLocal("");
    }

    setDurationMinutes(Math.max(1, Math.round((sessionData.session.durationSec || 0) / 60)));

    // Load working groups
    const initialGroups: WorkingGroup[] = sessionData.exerciseGroups.map((eg) => ({
      exercise: eg.exercise,
      sets: eg.sets.map((s, idx) => ({
        tempId: s.id || `set-${idx}-${Date.now()}`,
        originalId: s.id,
        setNumber: idx + 1,
        weight: s.weight,
        reps: s.reps,
        setType: s.setType,
        isCompleted: s.isCompleted,
      })),
    }));

    setGroups(initialGroups);
    setShowAddExerciseDrawer(false);
    setSearchExerciseQuery("");

    void db.exercises.toArray().then((list) => {
      setAllExercises(list);
    });
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
      const lastSet = g.sets[g.sets.length - 1];
      const nextNum = g.sets.length + 1;
      const newSet: WorkingSet = {
        tempId: `set-new-${Date.now()}-${Math.random()}`,
        setNumber: nextNum,
        weight: lastSet ? lastSet.weight : 20,
        reps: lastSet ? lastSet.reps : 10,
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

  const handleAddExerciseToSession = (exercise: LocalExercise) => {
    if (groups.some((g) => g.exercise.id === exercise.id)) {
      toast.error("Exercise is already in this workout");
      return;
    }

    const defaultSets: WorkingSet[] = [
      { tempId: `set-${Date.now()}-1`, setNumber: 1, weight: 20, reps: 10, setType: "WARMUP", isCompleted: true },
      { tempId: `set-${Date.now()}-2`, setNumber: 2, weight: 20, reps: 10, setType: "NORMAL", isCompleted: true },
      { tempId: `set-${Date.now()}-3`, setNumber: 3, weight: 20, reps: 10, setType: "NORMAL", isCompleted: true },
    ];

    setGroups((prev) => [...prev, { exercise, sets: defaultSets }]);
    setShowAddExerciseDrawer(false);
    toast.success(`Added "${exercise.name}" to workout`);
  };

  // Preview Totals
  const totalVolumePreview = groups.reduce((vol, g) => {
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

              {groups.map((group, groupIdx) => (
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
                        {group.exercise.category} •{" "}
                        <span className="text-emerald-400">{group.exercise.primaryMuscle}</span>
                      </span>
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

                  {/* Sets Table */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[24px_68px_1fr_1fr_36px_28px] gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-1 items-center">
                      <span>#</span>
                      <span>Type</span>
                      <span className="text-center">Weight</span>
                      <span className="text-center">Reps</span>
                      <span className="text-center">Done</span>
                      <span className="text-center">Del</span>
                    </div>

                    {group.sets.map((set, setIdx) => (
                      <div
                        key={set.tempId}
                        className={`grid grid-cols-[24px_68px_1fr_1fr_36px_28px] gap-1 items-center p-1.5 rounded-xl border text-xs ${
                          set.isCompleted
                            ? "bg-zinc-900/80 border-zinc-800 text-zinc-100"
                            : "bg-zinc-900/30 border-zinc-850/60 text-zinc-500"
                        }`}
                      >
                        {/* Set # */}
                        <span className="font-bold font-mono text-[11px] text-zinc-400 text-center">
                          {set.setNumber}
                        </span>

                        {/* Set Type Dropdown */}
                        <select
                          value={set.setType}
                          onChange={(e) =>
                            handleUpdateSet(groupIdx, setIdx, {
                              setType: e.target.value as SetType,
                            })
                          }
                          className="px-1 py-1 bg-zinc-950 border border-zinc-750 rounded-lg text-[10px] font-semibold text-zinc-200 focus:outline-none"
                        >
                          {SET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>

                        {/* Weight Input */}
                        <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg px-1.5 py-1">
                          <input
                            type="number"
                            step="0.5"
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
                          className="w-7 h-7 mx-auto rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
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
              ))}
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
