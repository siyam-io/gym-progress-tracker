"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  Layers,
  Plus,
  Trash2,
  Check,
  Save,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Pencil,
  Search,
  X,
  Sparkles,
  AlertCircle,
  Copy,
  Home,
} from "lucide-react";
import {
  db,
  LocalExercise,
  RoutineWithExercises,
  updateRoutine,
  updateExercise,
  deleteRoutine,
  createCustomExercise,
  getRoutineWithExercises,
  ExerciseCategory,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const ALL_CATEGORIES: ExerciseCategory[] = [
  "CARDIO",
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
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

export default function EditRoutinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const routineId = params?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<LocalExercise[]>([]);
  const [allExercises, setAllExercises] = useState<LocalExercise[]>([]);
  const [showOnHome, setShowOnHome] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Add Exercise Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Inline Custom Exercise Creation inside Add Drawer
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomCategory, setNewCustomCategory] = useState<ExerciseCategory>("BARBELL");
  const [newCustomMuscle, setNewCustomMuscle] = useState("Chest");

  // Exercise Inline Editing & Swapping State
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ExerciseCategory>("BARBELL");
  const [editMuscle, setEditMuscle] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSearch, setSwapSearch] = useState("");

  // Delete Routine Confirm Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load routine and exercise catalog
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!routineId) return;
      try {
        setIsLoading(true);
        const [r, exercisesList] = await Promise.all([
          getRoutineWithExercises(routineId),
          db.exercises.toArray(),
        ]);

        if (cancelled) return;

        setAllExercises(exercisesList);

        if (r) {
          setRoutine(r);
          setName(r.isSystem ? `${r.name} (Custom)` : r.name);
          setShowOnHome(r.showOnHome !== false);

          const seen = new Set<string>();
          const cleanExercises = r.items
            .map((i) => i.exercise)
            .filter((ex) => {
              if (!ex || seen.has(ex.id)) return false;
              seen.add(ex.id);
              return true;
            });
          setSelectedExercises(cleanExercises);
        } else {
          setRoutine(null);
        }
      } catch (err) {
        console.error("Failed to load routine for editing:", err);
        toast.error("Could not load routine details");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [routineId]);

  // Derived KPIs
  const { targetMuscles, estimatedDurationMin } = useMemo(() => {
    const muscles = Array.from(
      new Set(
        selectedExercises
          .map((e) => e.primaryMuscle)
          .filter((m): m is string => Boolean(m))
      )
    );
    const duration = Math.max(20, Math.round(selectedExercises.length * 3 * 3.5));
    return { targetMuscles: muscles, estimatedDurationMin: duration };
  }, [selectedExercises]);

  // Exercise Reordering
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
      setIsSwapping(false);
    }
  };

  const handleAddExercise = (exercise: LocalExercise) => {
    if (selectedExercises.some((e) => e.id === exercise.id)) {
      toast.info("Exercise is already in this routine");
      return;
    }
    setSelectedExercises((prev) => [...prev, exercise]);
    toast.success(`Added "${exercise.name}" to routine`);
  };

  // Inline Exercise Details Edit
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
    if (!editName.trim()) return;
    try {
      await updateExercise(exerciseId, {
        name: editName.trim(),
        category: editCategory,
        primaryMuscle: editMuscle.trim() || undefined,
      });

      setSelectedExercises((prev) =>
        prev.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                name: editName.trim(),
                category: editCategory,
                primaryMuscle: editMuscle.trim() || e.primaryMuscle,
              }
            : e
        )
      );

      setEditingExerciseId(null);
      setIsSwapping(false);
      toast.success("Movement details updated!");
    } catch (err) {
      console.error("Failed to update exercise:", err);
      toast.error("Failed to update exercise");
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

  // Custom Movement Creation inside drawer
  const handleCreateAndAdd = async () => {
    if (!newCustomName.trim()) return;
    try {
      const created = await createCustomExercise({
        name: newCustomName.trim(),
        category: newCustomCategory,
        primaryMuscle: newCustomCategory === "CARDIO" ? "Cardio" : newCustomMuscle,
        secondaryMuscles: [],
      });
      setSelectedExercises((prev) => [...prev, created]);
      setAllExercises((prev) => [...prev, created]);
      setNewCustomName("");
      setShowCreateCustom(false);
      toast.success(`Created & added "${created.name}"`);
    } catch (err) {
      console.error("Failed to create custom exercise:", err);
      toast.error("Failed to create exercise");
    }
  };

  // Save Routine
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!routine) return;

    if (!name.trim()) {
      toast.error("Please enter a routine name");
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error("Routine must have at least one exercise");
      return;
    }

    setIsSaving(true);
    try {
      await updateRoutine(
        routine.id,
        name.trim(),
        selectedExercises.map((e) => e.id),
        showOnHome
      );

      if (routine.isSystem) {
        toast.success(`Saved as personal routine "${name.trim()}"! 🎉`);
      } else {
        toast.success("Routine updated successfully! 🎉");
      }
      router.push("/routines");
    } catch (err) {
      console.error("Failed to update routine:", err);
      toast.error("Failed to save routine changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoutine = async () => {
    if (!routine || routine.isSystem) return;
    try {
      await deleteRoutine(routine.id);
      toast.success(`"${routine.name}" deleted`);
      router.push("/routines");
    } catch (err) {
      console.error("Failed to delete routine:", err);
      toast.error("Failed to delete routine");
    }
  };

  // Filter exercises in the add drawer
  const availableToAdd = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const selectedIds = new Set(selectedExercises.map((e) => e.id));
    return allExercises.filter((ex) => {
      if (selectedIds.has(ex.id)) return false;
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle?.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q);
      const matchesCat =
        selectedCategoryFilter === "ALL" || ex.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [allExercises, selectedExercises, searchQuery, selectedCategoryFilter]);

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 gap-3">
        <Layers className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-zinc-400">
          Loading Routine Editor...
        </p>
      </div>
    );
  }

  // Not Found State
  if (!routine) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Layers className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-black text-zinc-100">Routine Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1">
            This routine split could not be loaded or was already deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/routines")}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider"
        >
          Return to Routines
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-36 min-w-0 selection:bg-emerald-500 selection:text-zinc-950">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/routines")}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors shrink-0 active:scale-95"
            title="Back to Routines"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-100 truncate">
              {routine.isSystem ? "Customize Routine" : "Edit Routine"}
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">
              {routine.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!routine.isSystem && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors active:scale-95"
              title="Delete routine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || selectedExercises.length === 0}
            className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 space-y-4 flex-1">
        {/* 2. Executive Hero Meta Card */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/95 via-zinc-900/75 to-zinc-950/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Routine Name Input */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Routine Split Name</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-500">Required</span>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Day 01 Push & Upper Body"
              className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl text-base sm:text-lg font-black text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          {/* Home Screen Toggle */}
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                Show on Home Dashboard
              </span>
              <p className="text-[11px] text-zinc-400">
                Display this routine on the home screen quick workouts list
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOnHome(!showOnHome)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                showOnHome ? "bg-emerald-500" : "bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showOnHome ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* System Routine Copy-on-Write Alert */}
          {routine.isSystem && (
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-cyan-200">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-cyan-300">Default Built-in Routine:</span> Saving
                this will automatically create your personal customized routine copy without
                overwriting the global default template.
              </div>
            </div>
          )}

          {/* Dynamic KPI Tiles */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/70 relative z-10">
            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-emerald-400" />
                Movements
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-0.5">
                {selectedExercises.length}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">ex</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Est. Time
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-cyan-300 mt-0.5">
                ~{estimatedDurationMin}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">min</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                Muscles
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-purple-300 mt-0.5">
                {targetMuscles.length}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">groups</span>
              </span>
            </div>
          </div>

          {/* Muscle Chips */}
          {targetMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {targetMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] font-bold text-emerald-400/90"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 3. Movements Section Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Selected Movements ({selectedExercises.length})
          </h2>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Movement</span>
          </button>
        </div>

        {/* 4. Movements List */}
        {selectedExercises.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl p-6 flex flex-col items-center gap-3 bg-zinc-900/30">
            <Dumbbell className="w-10 h-10 text-zinc-600" />
            <div>
              <p className="font-bold text-zinc-300 text-sm">No exercises in this routine</p>
              <p className="text-xs text-zinc-500 mt-1">
                Tap Add Movement to select exercises for this split.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Movement</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedExercises.map((ex, index) => {
              const isEditing = editingExerciseId === ex.id;

              return (
                <div
                  key={ex.id}
                  className="rounded-3xl border border-zinc-800/80 bg-zinc-900/70 p-3.5 sm:p-4 shadow-lg space-y-3 transition-all"
                >
                  {/* Movement Row Item */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 font-mono font-bold text-xs text-zinc-400 flex items-center justify-center shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-sm text-zinc-100 block truncate">
                          {ex.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                          <span className="uppercase text-zinc-500 font-semibold font-mono">
                            {ex.category}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">
                            {ex.primaryMuscle}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Movement Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 disabled:opacity-20 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === selectedExercises.length - 1}
                        className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 disabled:opacity-20 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Details */}
                      <button
                        type="button"
                        onClick={() => handleStartEditExercise(ex)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                          isEditing
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Edit Details / Swap"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Movement Editor Drawer */}
                  {isEditing && (
                    <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Configure Movement
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSwapping((prev) => !prev)}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>{isSwapping ? "Cancel Swap" : "Swap Exercise"}</span>
                        </button>
                      </div>

                      {isSwapping ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={swapSearch}
                            onChange={(e) => setSwapSearch(e.target.value)}
                            placeholder="Search replacement movement..."
                            autoFocus
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500"
                          />
                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {allExercises
                              .filter(
                                (cand) =>
                                  cand.id !== ex.id &&
                                  cand.name.toLowerCase().includes(swapSearch.toLowerCase())
                              )
                              .slice(0, 10)
                              .map((cand) => (
                                <button
                                  key={cand.id}
                                  type="button"
                                  onClick={() => handleSwapExercise(index, cand)}
                                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-850 flex items-center justify-between text-xs text-zinc-300"
                                >
                                  <span className="font-semibold">{cand.name}</span>
                                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                                    {cand.category}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                              Exercise Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-100 outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                              Equipment Category
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {ALL_CATEGORIES.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setEditCategory(cat)}
                                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold border transition-all text-center ${
                                    editCategory === cat
                                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                              Target Muscle
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 max-h-28 overflow-y-auto pr-1">
                              {MUSCLE_OPTIONS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setEditMuscle(m)}
                                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-all truncate text-center ${
                                    editMuscle === m
                                      ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-400"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingExerciseId(null)}
                              className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditedExercise(ex.id)}
                              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold"
                            >
                              Save Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. Fixed Sticky Bottom Dock */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 p-3 sm:p-4">
        <div className="w-full max-w-lg mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/routines")}
            className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors active:scale-95 text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || selectedExercises.length === 0}
            className="flex-[2] py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaving ? "Saving..." : `Save Routine (${selectedExercises.length})`}</span>
          </button>
        </div>
      </footer>

      {/* 6. Add Movement Modal Drawer */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-zinc-100">
                  {showCreateCustom ? "New Custom Movement" : "Add to Routine"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {!showCreateCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomName(searchQuery.trim());
                      setShowCreateCustom(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Custom</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showCreateCustom ? (
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Incline Smith Press..."
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Equipment Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setNewCustomCategory(cat);
                          if (cat === "CARDIO") setNewCustomMuscle("Cardio");
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          newCustomCategory === cat
                            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {newCustomCategory !== "CARDIO" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                      Primary Muscle
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {MUSCLE_OPTIONS.filter((m) => m !== "Cardio").map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNewCustomMuscle(m)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all truncate text-center ${
                            newCustomMuscle === m
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
                    className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAndAdd}
                    disabled={!newCustomName.trim()}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Create & Add</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 pb-2 space-y-2">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search movements or muscles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 py-1">
                    {["ALL", ...ALL_CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          selectedCategoryFilter === cat
                            ? "bg-emerald-500 text-zinc-950 font-bold"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
                  {availableToAdd.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No matching exercises found.
                    </div>
                  ) : (
                    availableToAdd.slice(0, 30).map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => handleAddExercise(ex)}
                        className="w-full text-left p-3 rounded-xl border bg-zinc-950/70 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-850/50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-zinc-200">{ex.name}</span>
                          <span className="text-[11px] text-zinc-400">
                            {ex.category} •{" "}
                            <span className="text-emerald-400/90">{ex.primaryMuscle}</span>
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`Delete "${routine.name}"?`}
        description="Are you sure you want to delete this custom routine split? This cannot be undone."
        confirmLabel="Delete Routine"
        cancelLabel="Keep Routine"
        variant="danger"
        onConfirm={() => void handleDeleteRoutine()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
