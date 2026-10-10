"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Search, Dumbbell, Check, Activity, Sparkles, ArrowLeft } from "lucide-react";
import { db, LocalExercise, ExerciseCategory, createCustomRoutine, createCustomExercise } from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineCreated: () => void;
}

const CATEGORIES: Array<{ label: string; value: ExerciseCategory | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Cardio", value: "CARDIO" },
  { label: "Barbell", value: "BARBELL" },
  { label: "Dumbbell", value: "DUMBBELL" },
  { label: "Cable", value: "CABLE" },
  { label: "Machine", value: "MACHINE" },
  { label: "Bodyweight", value: "BODYWEIGHT" },
];

const MUSCLE_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Cardio",
  "Full Body",
];

export function CreateRoutineModal({
  isOpen,
  onClose,
  onRoutineCreated,
}: CreateRoutineModalProps) {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "ALL">("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Exercise Creation State
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>("BARBELL");
  const [customMuscle, setCustomMuscle] = useState("Chest");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setSelectedIds([]);
    setSearchQuery("");
    setSelectedCategory("ALL");
    setShowCreateCustom(false);
    setCustomName("");
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Hook 1: Load exercises asynchronously on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void db.exercises.toArray().then((items) => {
      if (!cancelled) {
        setExercises(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Hook 2: Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Early return ONLY after all hooks have been declared unconditionally
  if (!isOpen) return null;

  const filteredExercises = exercises.filter((ex) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscle.toLowerCase().includes(q) ||
      (ex.category && ex.category.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "ALL" ||
      ex.category === selectedCategory ||
      (selectedCategory === "CARDIO" && (ex.category === "CARDIO" || ex.primaryMuscle.toLowerCase() === "cardio"));

    return matchesSearch && matchesCategory;
  });

  const toggleSelectExercise = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    try {
      setIsCreatingCustom(true);
      const created = await createCustomExercise({
        name: customName.trim(),
        category: customCategory,
        primaryMuscle: customCategory === "CARDIO" ? "Cardio" : customMuscle,
        secondaryMuscles: [],
      });

      setExercises((prev) => [...prev, created]);
      setSelectedIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      toast.success(`Created & selected "${created.name}"! 🎉`);
      setCustomName("");
      setShowCreateCustom(false);
    } catch (err) {
      console.error("Failed to create custom exercise:", err);
      toast.error("Failed to create custom exercise.");
    } finally {
      setIsCreatingCustom(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await createCustomRoutine(name.trim(), selectedIds);
      resetForm();
      onRoutineCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create routine:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExercises = selectedIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is LocalExercise => !!e);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showCreateCustom ? (
              <button
                type="button"
                onClick={() => setShowCreateCustom(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center justify-center transition-colors"
                title="Back to routine"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-bold text-base text-zinc-100">
              {showCreateCustom ? "New Custom Movement" : "Create Custom Routine"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!showCreateCustom && (
              <button
                type="button"
                onClick={() => {
                  setCustomName(searchQuery.trim());
                  setShowCreateCustom(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Exercise Form Mode */}
        {showCreateCustom ? (
          <form onSubmit={handleCreateCustomExercise} className="p-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Exercise Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Incline Smith Press, Reverse Fly..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Equipment Category
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["BARBELL", "DUMBBELL", "CABLE", "MACHINE", "BODYWEIGHT", "CARDIO"] as ExerciseCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCustomCategory(cat);
                        if (cat === "CARDIO") setCustomMuscle("Cardio");
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        customCategory === cat
                          ? cat === "CARDIO"
                            ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                            : "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {customCategory !== "CARDIO" && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Primary Muscle Group
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {MUSCLE_OPTIONS.filter((m) => m !== "Cardio").map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCustomMuscle(m)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all truncate text-center ${
                        customMuscle === m
                          ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateCustom(false)}
                className="flex-1 py-3.5 min-h-[48px] rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customName.trim() || isCreatingCustom}
                className="flex-1 py-3.5 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isCreatingCustom ? "Creating..." : "Save & Select"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Form Body */
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-4 border-b border-zinc-800/80">
              {/* Routine Name */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Routine Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Day 04 Cardio & Abs or Full Body"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selected Exercises Chips */}
              {selectedExercises.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">
                    Selected Movements ({selectedExercises.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {selectedExercises.map((ex, index) => (
                      <span
                        key={ex.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
                      >
                        <span className="text-[10px] text-zinc-500 font-mono">{index + 1}.</span>
                        {ex.name}
                        <button
                          type="button"
                          onClick={() => toggleSelectExercise(ex.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search movements or cardio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Custom Banner if Search Query Typed */}
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(searchQuery.trim());
                    setShowCreateCustom(true);
                  }}
                  className="w-full p-2 rounded-xl bg-zinc-950/80 border border-dashed border-emerald-500/40 hover:border-emerald-500 text-left flex items-center justify-between text-xs text-emerald-400 group transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">
                      Create custom <span className="font-bold underline text-zinc-100">&quot;{searchQuery.trim()}&quot;</span>
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 group-hover:scale-105 transition-transform">
                    + Add
                  </span>
                </button>
              )}

              {/* Category Filter Pills (Wrapping, No Horizontal Scroll) */}
              <div className="flex flex-wrap gap-1.5 py-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      selectedCategory === cat.value
                        ? "bg-emerald-500 text-zinc-950 font-bold"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {cat.value === "CARDIO" && <Activity className="w-3 h-3" />}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Exercises Selection List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-zinc-500 text-xs">
                    No exercises found matching &quot;{searchQuery}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomName(searchQuery.trim());
                      setShowCreateCustom(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create &quot;{searchQuery.trim() || "Custom"}&quot; Movement</span>
                  </button>
                </div>
              ) : (
                filteredExercises.map((ex) => {
                  const isSelected = selectedIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => toggleSelectExercise(ex.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors min-h-[48px] ${
                        isSelected
                          ? "bg-emerald-950/25 border-emerald-500/40 text-emerald-300"
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-200">{ex.name}</span>
                        <span className="text-[11px] text-zinc-400">
                          {ex.category} • <span className="text-emerald-400">{ex.primaryMuscle}</span>
                        </span>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <button
                type="submit"
                disabled={!name.trim() || selectedIds.length === 0 || isSubmitting}
                className="w-full py-3.5 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? "Saving..." : `Save Routine (${selectedIds.length} exercises)`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
