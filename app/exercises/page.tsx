"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  Dumbbell,
  Trophy,
  Filter,
  ChevronRight,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";
import { db, LocalExercise, ExerciseCategory, initializeLocalDb } from "@/lib/db/dexie";
import { calculate1RM } from "@/lib/utils/pr-calculator";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { ExerciseDetailModal } from "@/components/exercises/ExerciseDetailModal";
import { CreateCustomExerciseModal } from "@/components/exercises/CreateCustomExerciseModal";

const CATEGORIES: { label: string; value: ExerciseCategory | "ALL" }[] = [
  { label: "All Equipment", value: "ALL" },
  { label: "Barbell", value: "BARBELL" },
  { label: "Dumbbell", value: "DUMBBELL" },
  { label: "Cable", value: "CABLE" },
  { label: "Machine", value: "MACHINE" },
  { label: "Bodyweight", value: "BODYWEIGHT" },
];

const MUSCLE_OPTIONS = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Quadriceps",
  "Hamstrings",
  "Triceps",
  "Biceps",
  "Calves",
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [bestRecords, setBestRecords] = useState<
    Map<string, { maxWeight: number; maxReps: number; e1rm: number }>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | "ALL">("ALL");

  // Modals
  const [inspectingExerciseId, setInspectingExerciseId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await initializeLocalDb();
      const [exList, sets] = await Promise.all([
        db.exercises.toArray(),
        db.setLogs.filter((s) => s.isCompleted).toArray(),
      ]);

      setExercises(exList);

      // Compute best weight, reps, and e1RM for each exercise
      const recordMap = new Map<string, { maxWeight: number; maxReps: number; e1rm: number }>();

      for (const s of sets) {
        const e1rm = calculate1RM(s.weight, s.reps);
        const curr = recordMap.get(s.exerciseId);

        if (!curr || e1rm > curr.e1rm) {
          recordMap.set(s.exerciseId, {
            maxWeight: s.weight,
            maxReps: s.reps,
            e1rm,
          });
        }
      }

      setBestRecords(recordMap);
    } catch (err) {
      console.error("Failed to load exercise library:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle.toLowerCase().includes(q) ||
        ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q));

      const matchesMuscle =
        selectedMuscle === "All" ||
        ex.primaryMuscle.toLowerCase() === selectedMuscle.toLowerCase() ||
        ex.secondaryMuscles.some((m) => m.toLowerCase() === selectedMuscle.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" || ex.category === selectedCategory;

      return matchesSearch && matchesMuscle && matchesCategory;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedCategory]);

  const hasActiveFilters = searchQuery !== "" || selectedMuscle !== "All" || selectedCategory !== "ALL";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 max-w-md mx-auto overflow-x-hidden selection:bg-emerald-500 selection:text-zinc-950 w-full">
      {/* Top Header */}
      <header className="px-5 pt-6 pb-4 border-b border-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100">Exercise Library</h1>
            <span className="text-[11px] text-zinc-500 font-semibold">
              {exercises.length} Movements Catalog
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Custom</span>
        </button>
      </header>

      {/* Filter Engine - Strict Zero-Horizontal-Scroll (All filters wrap or drop down cleanly) */}
      <div className="p-4 pb-2 space-y-2.5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search movement or muscle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2-Column Responsive Dropdown Filters (No side scrolling) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Muscle Selector */}
          <div className="relative">
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-200 py-2.5 px-3 pr-7 rounded-xl appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {MUSCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === "All" ? "All Muscles" : m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category / Equipment Selector */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ExerciseCategory | "ALL")}
              className="w-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-200 py-2.5 px-3 pr-7 rounded-xl appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Muscle Wrap Badges (Wrapped, no horizontal scrolling) */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {MUSCLE_OPTIONS.slice(0, 6).map((m) => {
            const isSelected = selectedMuscle === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMuscle(m)}
                className={`px-2.5 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold transition-colors ${
                  isSelected
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm shadow-emerald-500/20"
                    : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {m}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedMuscle("All");
                setSelectedCategory("ALL");
              }}
              className="px-2.5 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Exercise Cards List */}
      <main className="p-4 pt-1 space-y-2.5 flex-1">
        <div className="flex items-center justify-between pb-1 text-[11px] text-zinc-500">
          <span>Found {filteredExercises.length} movements</span>
          <span>Tap to drill down</span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            Loading exercise library...
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl p-6">
            <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 font-bold">No movements match criteria</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedMuscle("All");
                setSelectedCategory("ALL");
              }}
              className="mt-2 text-xs font-bold text-emerald-400"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredExercises.map((ex) => {
            const record = bestRecords.get(ex.id);

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => setInspectingExerciseId(ex.id)}
                className="w-full text-left p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 flex items-center gap-3 transition-all active:scale-[0.99] group shadow-sm"
              >
                {/* Anatomical illustration on the left (aspect-square ~64px) */}
                <ExerciseThumbnail
                  imageUrl={ex.imageUrl}
                  name={ex.name}
                  size="md"
                  className="rounded-xl border border-zinc-800 shrink-0"
                />

                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-xs text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
                        {ex.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-500 font-semibold">
                          {ex.category}
                        </span>
                        <span className="text-zinc-600 text-[10px]">•</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {ex.primaryMuscle}
                        </span>
                        {ex.secondaryMuscles.length > 0 && (
                          <>
                            <span className="text-zinc-600 text-[10px]">•</span>
                            <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                              {ex.secondaryMuscles.join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ex.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Custom
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  </div>

                  {/* All-Time PR Badge on Card */}
                  {record && record.e1rm > 0 ? (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] font-mono">
                      <span className="text-amber-400 font-bold flex items-center gap-1 truncate">
                        <Trophy className="w-3 h-3 fill-amber-400 shrink-0" />
                        <span>Best: {record.maxWeight}kg × {record.maxReps}</span>
                      </span>
                      <span className="text-zinc-400 shrink-0 ml-1">
                        e1RM: <span className="text-emerald-400 font-bold">{record.e1rm}kg</span>
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-600 italic">
                      No completed sets logged yet
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </main>

      {/* Exercise Detail History Drawer */}
      <ExerciseDetailModal
        exerciseId={inspectingExerciseId}
        onClose={() => setInspectingExerciseId(null)}
      />

      {/* Create Custom Exercise Modal */}
      <CreateCustomExerciseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onExerciseCreated={() => void loadData()}
      />
    </div>
  );
}
