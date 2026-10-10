"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Plus, Dumbbell, Sparkles, Check, ArrowLeft } from "lucide-react";
import { db, LocalExercise, ExerciseCategory, createCustomExercise } from "@/lib/db/dexie";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { toast } from "@/stores/useToastStore";

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function AddExerciseModal({ isOpen, onClose }: AddExerciseModalProps) {
  const { addExercise, exerciseGroups } = useWorkoutStore();
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "ALL">("ALL");

  // Custom Exercise Creation State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>("BARBELL");
  const [customMuscle, setCustomMuscle] = useState("Chest");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void db.exercises.toArray().then((items) => {
      setExercises(items);
    });
    setShowCreateForm(false);
    setSearchQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentExerciseIds = new Set(exerciseGroups.map((g) => g.exercise.id));

  const filteredExercises = exercises.filter((ex) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return (
        selectedCategory === "ALL" ||
        ex.category === selectedCategory ||
        (selectedCategory === "CARDIO" && (ex.category === "CARDIO" || ex.primaryMuscle.toLowerCase() === "cardio"))
      );
    }
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

  const handleSelect = (exercise: LocalExercise) => {
    void addExercise(exercise);
    onClose();
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    try {
      setIsCreating(true);
      const created = await createCustomExercise({
        name: customName.trim(),
        category: customCategory,
        primaryMuscle: customCategory === "CARDIO" ? "Cardio" : customMuscle,
        secondaryMuscles: [],
      });

      // Update local state list
      setExercises((prev) => [...prev, created]);
      // Immediately add to active workout
      await addExercise(created);
      toast.success(`Created & added "${created.name}" to workout! 🚀`);
      setShowCreateForm(false);
      setCustomName("");
      onClose();
    } catch (err) {
      console.error("Failed to create custom exercise:", err);
      toast.error("Failed to create exercise.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center justify-center transition-colors"
                title="Back to search"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-bold text-base text-zinc-100">
              {showCreateForm ? "New Custom Movement" : "Add Exercise"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!showCreateForm && (
              <button
                type="button"
                onClick={() => {
                  setCustomName(searchQuery.trim());
                  setShowCreateForm(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Exercise Form Mode */}
        {showCreateForm ? (
          <form onSubmit={handleCreateCustom} className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Movement Name */}
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

            {/* Category Selector */}
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

            {/* Primary Target Muscle */}
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

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!customName.trim() || isCreating}
                className="w-full py-3.5 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isCreating ? "Creating..." : "Save & Add to Workout"}</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Search Input */}
            <div className="p-4 pb-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search exercise or muscle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Filter Pills (Clean Wrapping, No Horizontal Scroll) */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold transition-colors ${
                      selectedCategory === cat.value
                        ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick Create Custom Banner if Search Query Exists */}
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(searchQuery.trim());
                    setShowCreateForm(true);
                  }}
                  className="w-full mt-1 p-2.5 rounded-xl bg-zinc-950/80 border border-dashed border-emerald-500/40 hover:border-emerald-500 text-left flex items-center justify-between text-xs text-emerald-400 group transition-all"
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
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-zinc-500 text-sm">
                    No exercises match &quot;{searchQuery}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomName(searchQuery.trim());
                      setShowCreateForm(true);
                    }}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create &quot;{searchQuery.trim() || "Custom"}&quot; Movement</span>
                  </button>
                </div>
              ) : (
                filteredExercises.map((ex) => {
                  const isAlreadyAdded = currentExerciseIds.has(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => handleSelect(ex)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        isAlreadyAdded
                          ? "bg-zinc-950/40 border-zinc-800/40 opacity-50 cursor-not-allowed"
                          : "bg-zinc-950/70 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-200">{ex.name}</span>
                        <span className="text-xs text-zinc-400">
                          {ex.category} • <span className="text-emerald-400/90">{ex.primaryMuscle}</span>
                        </span>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isAlreadyAdded
                            ? "bg-zinc-800 text-zinc-600"
                            : "bg-zinc-800 text-emerald-400 border border-zinc-700"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
