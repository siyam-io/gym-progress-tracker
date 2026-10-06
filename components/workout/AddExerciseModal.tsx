"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Plus, Dumbbell, Filter } from "lucide-react";
import { db, LocalExercise, ExerciseCategory } from "@/lib/db/dexie";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: Array<{ label: string; value: ExerciseCategory | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Barbell", value: "BARBELL" },
  { label: "Dumbbell", value: "DUMBBELL" },
  { label: "Cable", value: "CABLE" },
  { label: "Machine", value: "MACHINE" },
  { label: "Bodyweight", value: "BODYWEIGHT" },
];

export function AddExerciseModal({ isOpen, onClose }: AddExerciseModalProps) {
  const { addExercise, exerciseGroups } = useWorkoutStore();
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "ALL">("ALL");

  useEffect(() => {
    if (!isOpen) return;
    void db.exercises.toArray().then((items) => {
      setExercises(items);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentExerciseIds = new Set(exerciseGroups.map((g) => g.exercise.id));

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primaryMuscle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (exercise: LocalExercise) => {
    void addExercise(exercise);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-100">Add Exercise</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {filteredExercises.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No exercises match your search.
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
      </div>
    </div>
  );
}
