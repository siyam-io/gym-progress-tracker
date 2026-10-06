"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Dumbbell, Plus } from "lucide-react";
import { createCustomExercise, ExerciseCategory } from "@/lib/db/dexie";

interface CreateCustomExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExerciseCreated: () => void;
}

const MUSCLE_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Quadriceps",
  "Hamstrings",
  "Triceps",
  "Biceps",
  "Calves",
  "Core",
  "Forearms",
  "Glutes",
  "Traps",
];

export function CreateCustomExerciseModal({
  isOpen,
  onClose,
  onExerciseCreated,
}: CreateCustomExerciseModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("BARBELL");
  const [primaryMuscle, setPrimaryMuscle] = useState("Chest");
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSecondary = (muscle: string) => {
    if (secondaryMuscles.includes(muscle)) {
      setSecondaryMuscles(secondaryMuscles.filter((m) => m !== muscle));
    } else {
      setSecondaryMuscles([...secondaryMuscles, muscle]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await createCustomExercise({
        name: name.trim(),
        category,
        primaryMuscle,
        secondaryMuscles,
      });

      setName("");
      setSecondaryMuscles([]);
      onExerciseCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create custom exercise:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-zinc-100">Add Custom Movement</h2>
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* Movement Name */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                Movement Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bulgarian Split Squat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Equipment Category */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                Equipment Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="BARBELL">Barbell</option>
                <option value="DUMBBELL">Dumbbell</option>
                <option value="MACHINE">Machine</option>
                <option value="CABLE">Cable</option>
                <option value="BODYWEIGHT">Bodyweight</option>
              </select>
            </div>

            {/* Primary Muscle Group */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                Primary Muscle Group
              </label>
              <select
                value={primaryMuscle}
                onChange={(e) => setPrimaryMuscle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {MUSCLE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Muscle Groups (Tags) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Secondary Muscles (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_OPTIONS.filter((m) => m !== primaryMuscle).map((m) => {
                  const isSelected = secondaryMuscles.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleSecondary(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        isSelected
                          ? "bg-zinc-800 border-emerald-500 text-emerald-300"
                          : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full py-3 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? "Saving..." : "Save Custom Movement"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
