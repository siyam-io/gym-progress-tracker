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
  Pencil,
  ArrowLeftRight,
  Activity,
} from "lucide-react";
import {
  db,
  LocalExercise,
  RoutineWithExercises,
  updateRoutine,
  updateExercise,
  createCustomExercise,
  ExerciseCategory,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

interface EditRoutineModalProps {
  routine: RoutineWithExercises | null;
  isOpen: boolean;
  onClose: () => void;
  onRoutineUpdated: () => void;
}

const ALL_CATEGORIES: ExerciseCategory[] = [
  "CARDIO",
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
];

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

  // Exercise inline editing state
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ExerciseCategory>("BARBELL");
  const [editMuscle, setEditMuscle] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSearch, setSwapSearch] = useState("");

  // Create new custom movement drawer
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomCategory, setNewCustomCategory] = useState<ExerciseCategory>("BARBELL");

  useEffect(() => {
    if (!isOpen || !routine) return;
    setName(routine.name);
    const seen = new Set<string>();
    const cleanExercises = routine.items
      .map((i) => i.exercise)
      .filter((ex) => {
        if (!ex || seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      });
    setSelectedExercises(cleanExercises);
    setShowAddSection(false);
    setEditingExerciseId(null);
    setIsSwapping(false);
    setShowCreateCustom(false);

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
    if (editingExerciseId === exerciseId) {
      setEditingExerciseId(null);
    }
  };

  const handleAddExercise = (exercise: LocalExercise) => {
    if (selectedExercises.some((e) => e.id === exercise.id)) return;
    setSelectedExercises((prev) => [...prev, exercise]);
  };

  const handleStartEditExercise = (ex: LocalExercise) => {
    if (editingExerciseId === ex.id) {
      setEditingExerciseId(null);
      setIsSwapping(false);
      return;
    }
    setEditingExerciseId(ex.id);
    setEditName(ex.name);
    setEditCategory(ex.category);
    setEditMuscle(ex.primaryMuscle || "");
    setIsSwapping(false);
    setSwapSearch("");
  };

  const handleSaveEditedExercise = async (exerciseId: string) => {
    if (!editName.trim()) {
      toast.error("Exercise name cannot be empty");
      return;
    }

    try {
      const updated = await updateExercise(exerciseId, {
        name: editName.trim(),
        category: editCategory,
        primaryMuscle: editMuscle.trim() || (editCategory === "CARDIO" ? "Cardio" : "Full Body"),
      });

      if (updated) {
        setSelectedExercises((prev) =>
          prev.map((e) => (e.id === exerciseId ? updated : e))
        );
        setAllExercises((prev) =>
          prev.map((e) => (e.id === exerciseId ? updated : e))
        );
        toast.success(`Updated "${updated.name}"`);
      }
    } catch (err) {
      console.error("Failed to update exercise:", err);
      toast.error("Failed to update exercise.");
    } finally {
      setEditingExerciseId(null);
      setIsSwapping(false);
    }
  };

  const handleSwapExercise = (index: number, replacement: LocalExercise) => {
    const next = [...selectedExercises];
    next[index] = replacement;
    setSelectedExercises(next);
    setIsSwapping(false);
    setEditingExerciseId(null);
    toast.success(`Swapped with "${replacement.name}"`);
  };

  const handleCreateAndAdd = async () => {
    if (!newCustomName.trim()) return;
    try {
      const created = await createCustomExercise({
        name: newCustomName.trim(),
        category: newCustomCategory,
        primaryMuscle: newCustomCategory === "CARDIO" ? "Cardio" : "Full Body",
        secondaryMuscles: [],
      });
      setSelectedExercises((prev) => [...prev, created]);
      setAllExercises((prev) => [...prev, created]);
      setNewCustomName("");
      setShowCreateCustom(false);
      toast.success(`Created & added "${created.name}"`);
    } catch (err) {
      console.error("Failed to create custom exercise:", err);
      toast.error("Failed to create exercise.");
    }
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
      toast.success("Routine updated successfully!");
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
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {selectedExercises.map((ex, index) => {
                    const isEditing = editingExerciseId === ex.id;
                    const isCardio =
                      ex.category === "CARDIO" || ex.primaryMuscle?.toLowerCase() === "cardio";

                    return (
                      <div
                        key={ex.id}
                        className={`rounded-xl border transition-all ${
                          isEditing
                            ? "bg-zinc-900 border-emerald-500/60 shadow-lg shadow-emerald-500/5"
                            : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80"
                        }`}
                      >
                        {/* Main Item Row */}
                        <div className="flex items-center justify-between p-2.5 gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-mono font-bold text-zinc-400 shrink-0">
                              {index + 1}
                            </span>
                            <div
                              onClick={() => handleStartEditExercise(ex)}
                              className="min-w-0 cursor-pointer group flex-1"
                              title="Click to edit exercise name and category"
                            >
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate leading-snug">
                                  {ex.name}
                                </h4>
                                <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                              </div>
                              <span className="text-[10px] text-zinc-500 truncate block">
                                {isCardio ? (
                                  <span className="text-cyan-400 font-medium">Cardio</span>
                                ) : (
                                  `${ex.category} • ${ex.primaryMuscle}`
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Reorder, Edit & Delete Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditExercise(ex)}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                isEditing
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400"
                              }`}
                              title="Edit Exercise"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

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
                              className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-red-950/40 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors ml-0.5"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Exercise Editor Card */}
                        {isEditing && (
                          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/90 rounded-b-xl space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                                Exercise Name
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Exercise name..."
                                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-semibold text-zinc-100 outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                                Category
                              </label>
                              <div className="grid grid-cols-3 gap-1">
                                {ALL_CATEGORIES.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setEditCategory(cat);
                                      if (cat === "CARDIO") setEditMuscle("Cardio");
                                    }}
                                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                      editCategory === cat
                                        ? cat === "CARDIO"
                                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                                          : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                                Target Muscle
                              </label>
                              <input
                                type="text"
                                value={editMuscle}
                                onChange={(e) => setEditMuscle(e.target.value)}
                                placeholder="e.g. Chest, Quads, Full Body"
                                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-semibold text-zinc-200 outline-none"
                              />
                            </div>

                            {/* Swap Movement Option */}
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => setIsSwapping((prev) => !prev)}
                                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                                <span>
                                  {isSwapping ? "Cancel Swap" : "Swap with another exercise..."}
                                </span>
                              </button>

                              {isSwapping && (
                                <div className="mt-2 p-2 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                                  <input
                                    type="text"
                                    value={swapSearch}
                                    onChange={(e) => setSwapSearch(e.target.value)}
                                    placeholder="Search movement to swap with..."
                                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-200 outline-none focus:border-emerald-500"
                                  />
                                  <div className="max-h-28 overflow-y-auto space-y-1">
                                    {allExercises
                                      .filter(
                                        (cand) =>
                                          cand.id !== ex.id &&
                                          cand.name.toLowerCase().includes(swapSearch.toLowerCase())
                                      )
                                      .slice(0, 8)
                                      .map((cand) => (
                                        <button
                                          key={cand.id}
                                          type="button"
                                          onClick={() => handleSwapExercise(index, cand)}
                                          className="w-full text-left p-1.5 rounded hover:bg-zinc-850 flex items-center justify-between text-xs text-zinc-300"
                                        >
                                          <span className="truncate font-semibold">{cand.name}</span>
                                          <span className="text-[10px] text-zinc-500 uppercase">
                                            {cand.category}
                                          </span>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-zinc-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExerciseId(null);
                                  setIsSwapping(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 font-bold text-xs transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedExercise(ex.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Save Exercise</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Exercise Accordion Drawer */}
            {showAddSection && (
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">
                    Add from Exercise Library
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateCustom((prev) => !prev)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {showCreateCustom ? "View Library" : "+ Create Custom"}
                  </button>
                </div>

                {/* Create Custom Movement Drawer */}
                {showCreateCustom ? (
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2">
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      placeholder="Movement name (e.g. Incline DB Fly)"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {ALL_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCustomCategory(cat)}
                          className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 border ${
                            newCustomCategory === cat
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateAndAdd}
                      disabled={!newCustomName.trim()}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
                    >
                      Create & Add to Routine
                    </button>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
