"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Dumbbell,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  db,
  LocalExercise,
  RoutineWithExercises,
  updateRoutine,
  ExerciseCategory,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

interface EditRoutineModalProps {
  routine: RoutineWithExercises | null;
  isOpen: boolean;
  onClose: () => void;
  onRoutineUpdated: () => void;
}

export function EditRoutineModal({
  routine,
  isOpen,
  onClose,
  onRoutineUpdated,
}: EditRoutineModalProps) {
  const [name, setName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<LocalExercise[]>([]);
  const [allExercises, setAllExercises] = useState<LocalExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | "ALL">("ALL");
  const [showAddSection, setShowAddSection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !routine) return;
    setName(routine.name);
    setSelectedExercises(routine.items.map((i) => i.exercise));
    setShowAddSection(false);

    void db.exercises.toArray().then((list) => {
      setAllExercises(list);
    });
  }, [isOpen, routine]);

  if (!isOpen || !routine) return null;

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...selectedExercises];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSelectedExercises(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedExercises.length - 1) return;
    const next = [...selectedExercises];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSelectedExercises(next);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== exerciseId));
  };

  const handleAddExercise = (exercise: LocalExercise) => {
    if (selectedExercises.some((e) => e.id === exercise.id)) return;
    setSelectedExercises((prev) => [...prev, exercise]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedExercises.length === 0) return;

    setIsSaving(true);
    try {
      await updateRoutine(
        routine.id,
        name.trim(),
        selectedExercises.map((e) => e.id)
      );
      onRoutineUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to update routine:", err);
      toast.error("Failed to save routine changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableToAdd = allExercises
    .filter((e) => !selectedExercises.some((s) => s.id === e.id))
    .filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "ALL" || e.category === categoryFilter;
      return matchSearch && matchCat;
    });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 tracking-tight leading-none">
                Edit Routine
              </h2>
              <span className="text-xs text-zinc-400 mt-0.5 block">
                Customize exercises, sequence, and routine name
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

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {/* Routine Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Routine Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Day 01 - Push & Core"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold text-zinc-100 outline-none"
                required
              />
            </div>

            {/* Current Exercises List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Exercises in Routine ({selectedExercises.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSection((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddSection ? "Hide Library" : "Add Exercise"}</span>
                </button>
              </div>

              {selectedExercises.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                  No exercises in this routine. Add at least one exercise below.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {selectedExercises.map((ex, index) => {
                    const isCardio =
                      ex.category === "CARDIO" || ex.primaryMuscle?.toLowerCase() === "cardio";

                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700/80 gap-2 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-400 shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-zinc-200 truncate leading-snug">
                              {ex.name}
                            </h4>
                            <span className="text-[10px] text-zinc-500 truncate block">
                              {isCardio ? (
                                <span className="text-cyan-400">Cardio</span>
                              ) : (
                                `${ex.category} • ${ex.primaryMuscle}`
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Reorder & Delete Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === selectedExercises.length - 1}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-red-950/40 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors ml-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Exercise Accordion Drawer */}
            {showAddSection && (
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-zinc-300 block">
                  Add from Exercise Library
                </span>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movement to add..."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Available Exercises List */}
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {availableToAdd.length === 0 ? (
                    <div className="p-3 text-center text-zinc-500 text-xs">
                      No matching exercises found to add.
                    </div>
                  ) : (
                    availableToAdd.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-zinc-200 truncate">{ex.name}</p>
                          <span className="text-[10px] text-zinc-500">
                            {ex.category} • {ex.primaryMuscle}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddExercise(ex)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-bold text-xs flex items-center gap-1 transition-all shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-zinc-800 flex items-center gap-2.5 bg-zinc-950 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || selectedExercises.length === 0}
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? "Saving..." : "Save Routine"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
