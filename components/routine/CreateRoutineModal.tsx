"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Search, Dumbbell, Check, Trash2 } from "lucide-react";
import { db, LocalExercise, ExerciseCategory, createCustomRoutine } from "@/lib/db/dexie";

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineCreated: () => void;
}

const CATEGORIES: Array<{ label: string; value: ExerciseCategory | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Barbell", value: "BARBELL" },
  { label: "Dumbbell", value: "DUMBBELL" },
  { label: "Cable", value: "CABLE" },
  { label: "Machine", value: "MACHINE" },
  { label: "Bodyweight", value: "BODYWEIGHT" },
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

  useEffect(() => {
    if (!isOpen) return;
    void db.exercises.toArray().then((items) => {
      setExercises(items);
    });
    setName("");
    setSelectedIds([]);
    setSearchQuery("");
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primaryMuscle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelectExercise = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await createCustomRoutine(name.trim(), selectedIds);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-100">Create Custom Routine</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 border-b border-zinc-800/80">
            {/* Routine Name */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Routine Name
              </label>
              <input
                type="text"
                placeholder="e.g. Upper Body Hypertrophy"
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
                placeholder="Search movements to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Pills (Wrapping, No Horizontal Scroll) */}
            <div className="flex flex-wrap gap-1.5 py-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises Selection List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredExercises.map((ex) => {
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
            })}
          </div>

          {/* Modal Footer */}
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
      </div>
    </div>
  );
}
