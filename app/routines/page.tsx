"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Plus,
  Play,
  Pencil,
  Trash2,
  Download,
  Layers,
  Sparkles,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  initializeLocalDb,
  getRoutinesWithExercises,
  RoutineWithExercises,
  deleteRoutine,
  createCustomRoutine,
  DEFAULT_EXERCISES,
} from "@/lib/db/dexie";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { PulseLogo } from "@/components/ui/Logo";
import { EditRoutineModal } from "@/components/routine/EditRoutineModal";
import { CreateRoutineModal } from "@/components/routine/CreateRoutineModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/stores/useToastStore";

// Predefined template splits ready to import with 1-click
interface PresetTemplate {
  id: string;
  name: string;
  category: "PPL" | "SPLIT" | "CARDIO" | "FULL BODY";
  description: string;
  targetMuscles: string[];
  exerciseIds: string[];
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "tpl-push-power",
    name: "Push Power Split (Chest, Shoulders, Triceps)",
    category: "PPL",
    description: "Maximum hypertrophy bench press, machine press, dip, and tricep pushdown.",
    targetMuscles: ["Chest", "Shoulders", "Triceps"],
    exerciseIds: [
      "ex-warm-up",
      "ex-barbell-bench-press",
      "ex-incline-press",
      "ex-pec-deck-fly",
      "ex-machine-shoulder-press",
      "ex-cable-tricep-pushdown",
      "ex-dips",
      "ex-overhead-extension",
    ],
  },
  {
    id: "tpl-pull-hypertrophy",
    name: "Pull & Lats Hypertrophy (Back, Rear Delts, Biceps)",
    category: "PPL",
    description: "V-taper back development with lat pulldowns, rows, and targeted arm curls.",
    targetMuscles: ["Back", "Biceps", "Forearms"],
    exerciseIds: [
      "ex-warm-up",
      "ex-pull-up",
      "ex-lat-pulldown",
      "ex-reverse-lat-pulldown",
      "ex-seated-cable-row",
      "ex-low-row",
      "ex-barbell-curl",
      "ex-hammer-curl",
      "ex-preacher-curl",
    ],
  },
  {
    id: "tpl-legs-core",
    name: "Lower Body Engine (Quads, Hamstrings, Core)",
    category: "SPLIT",
    description: "Foundation leg strength with squats, extensions, leg curls, and core stability.",
    targetMuscles: ["Quadriceps", "Hamstrings", "Calves", "Core"],
    exerciseIds: [
      "ex-warm-up",
      "ex-squats",
      "ex-walking-lunges",
      "ex-leg-extension",
      "ex-leg-curl",
      "ex-calf-raise",
      "ex-crunches",
      "ex-leg-raise",
      "ex-plank",
    ],
  },
  {
    id: "tpl-cardio-shred",
    name: "Cardio Shred & Core Burn",
    category: "CARDIO",
    description: "High-intensity endurance conditioning with treadmill, cross trainer, cycle, and core circuits.",
    targetMuscles: ["Cardio", "Core", "Full Body"],
    exerciseIds: [
      "ex-warm-up",
      "ex-treadmill",
      "ex-cross-trainer",
      "ex-stationary-cycle",
      "ex-jump-rope",
      "ex-crunches",
      "ex-leg-raise",
      "ex-plank",
    ],
  },
  {
    id: "tpl-full-body-strength",
    name: "Full Body 3x Compound Blast",
    category: "FULL BODY",
    description: "Efficient full-body session hitting all major muscle groups in under 50 minutes.",
    targetMuscles: ["Full Body", "Chest", "Back", "Legs"],
    exerciseIds: [
      "ex-warm-up",
      "ex-squats",
      "ex-barbell-bench-press",
      "ex-lat-pulldown",
      "ex-machine-shoulder-press",
      "ex-barbell-curl",
      "ex-cable-tricep-pushdown",
      "ex-plank",
    ],
  },
];

export default function RoutinesPage() {
  const router = useRouter();
  const { startWorkout } = useWorkoutStore();

  const [activeTab, setActiveTab] = useState<"MY_ROUTINES" | "IMPORT_TEMPLATES">("MY_ROUTINES");
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [editingRoutine, setEditingRoutine] = useState<RoutineWithExercises | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  const loadRoutines = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      await initializeLocalDb();
      const fetched = await getRoutinesWithExercises();
      setRoutines(fetched);
    } catch (err) {
      console.error("Failed to load routines:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadRoutines();
    });

    const handleSync = () => {
      if (!cancelled) void loadRoutines();
    };

    window.addEventListener("pulse-data-synced", handleSync);
    return () => {
      cancelled = true;
      window.removeEventListener("pulse-data-synced", handleSync);
    };
  }, [loadRoutines]);

  const handleStartRoutine = async (routine: RoutineWithExercises) => {
    const seen = new Set<string>();
    const exercises = routine.items
      .map((i) => i.exercise)
      .filter((ex) => {
        if (!ex || seen.has(ex.id)) return false;
        seen.add(ex.id);
        return true;
      });
    await startWorkout(routine.name, exercises, routine.id);
    router.push("/workout/active");
  };

  const handleImportTemplate = async (template: PresetTemplate) => {
    try {
      await createCustomRoutine(template.name, template.exerciseIds);
      toast.success(`Imported "${template.name}" into your routines!`);
      await loadRoutines();
      setActiveTab("MY_ROUTINES");
    } catch (err) {
      console.error("Failed to import template:", err);
      toast.error("Failed to import routine template.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!routineToDelete) return;
    try {
      await deleteRoutine(routineToDelete.id);
      setRoutineToDelete(null);
      await loadRoutines();
    } catch (err) {
      console.error("Failed to delete routine:", err);
      toast.error("Failed to delete routine.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 max-w-md mx-auto selection:bg-emerald-500 selection:text-zinc-950">
      {/* Sticky Header */}
      <header className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 active:scale-95 transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <PulseLogo size="sm" />
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100 leading-none">
              Routines Hub
            </h1>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 block">
              Manage & Import
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Routine</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="p-4 sm:p-5 space-y-4 flex-1">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("MY_ROUTINES")}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "MY_ROUTINES"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Routines ({routines.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("IMPORT_TEMPLATES")}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "IMPORT_TEMPLATES"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Splits ({PRESET_TEMPLATES.length})</span>
          </button>
        </div>

        {/* TAB 1: MY ROUTINES */}
        {activeTab === "MY_ROUTINES" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {isLoading ? (
              <div className="p-12 text-center text-zinc-500 text-xs">Loading routines...</div>
            ) : routines.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-3xl space-y-3">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-bold text-zinc-300">No routines saved yet</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Import a workout split template or create your own custom routine.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("IMPORT_TEMPLATES")}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Browse Templates to Import</span>
                </button>
              </div>
            ) : (
              routines.map((routine) => {
                const isExpanded = expandedRoutineId === routine.id;

                return (
                  <div
                    key={routine.id}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 space-y-3 shadow-md transition-all"
                  >
                    {/* Top Header of Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-base text-zinc-100 tracking-tight truncate">
                          {routine.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-medium">
                          <span className="flex items-center gap-1 text-emerald-400 font-mono">
                            <Dumbbell className="w-3.5 h-3.5" />
                            {routine.items.length} movements
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            ~{routine.estimatedDurationMin} min
                          </span>
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingRoutine(routine)}
                          className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors"
                          title="Edit Routine"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setRoutineToDelete({ id: routine.id, name: routine.name })
                          }
                          className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors"
                          title="Delete Routine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Muscle Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {routine.targetMuscles.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-850 text-[10px] font-semibold"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>

                    {/* Exercise List Collapsible Toggle */}
                    <div className="border-t border-zinc-800/60 pt-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRoutineId(isExpanded ? null : routine.id)
                        }
                        className="w-full flex items-center justify-between text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <span>
                          {isExpanded ? "Hide Exercises" : `View All ${routine.items.length} Exercises`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 space-y-1 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850 max-h-56 overflow-y-auto">
                          {routine.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-1 text-xs text-zinc-300"
                            >
                              <span className="truncate pr-2">
                                <span className="font-mono text-zinc-500 mr-2">
                                  {idx + 1}.
                                </span>
                                {item.exercise.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 shrink-0 uppercase font-mono">
                                {item.exercise.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Start Workout Primary CTA Button */}
                    <button
                      type="button"
                      onClick={() => handleStartRoutine(routine)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-zinc-950" />
                      <span>Start Workout Session</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: IMPORT PRESET TEMPLATES */}
        {activeTab === "IMPORT_TEMPLATES" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-500/20 space-y-1">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Gym Splits Library
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Import any of these pre-configured workout routines with 1-click. Once imported, you can customize exercises, sets, and sequences freely.
              </p>
            </div>

            {PRESET_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 space-y-3 shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-cyan-400 border border-cyan-900/40 text-[10px] font-black uppercase tracking-wider">
                      {tpl.category}
                    </span>
                    <h3 className="font-extrabold text-sm text-zinc-100 tracking-tight mt-1.5">
                      {tpl.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleImportTemplate(tpl)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs flex items-center gap-1 shadow-md shadow-cyan-500/20 active:scale-95 transition-all shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Import</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Movements included */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                    Includes {tpl.exerciseIds.length} exercises:
                  </span>
                  <div className="flex flex-wrap gap-1 text-[11px] text-zinc-300">
                    {tpl.exerciseIds.map((exId, idx) => {
                      const matched = DEFAULT_EXERCISES.find((e) => e.id === exId);
                      return (
                        <span key={exId} className="inline-flex items-center">
                          {matched?.name || exId}
                          {idx < tpl.exerciseIds.length - 1 && (
                            <span className="text-zinc-600 mx-1">•</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Routine Modal */}
      <EditRoutineModal
        routine={editingRoutine}
        isOpen={!!editingRoutine}
        onClose={() => setEditingRoutine(null)}
        onRoutineUpdated={() => void loadRoutines()}
      />

      {/* Create Custom Routine Modal */}
      <CreateRoutineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoutineCreated={() => void loadRoutines()}
      />

      {/* Routine Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!routineToDelete}
        title={`Delete "${routineToDelete?.name || "Routine"}"?`}
        description="Are you sure you want to delete this routine? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRoutineToDelete(null)}
      />
    </div>
  );
}
