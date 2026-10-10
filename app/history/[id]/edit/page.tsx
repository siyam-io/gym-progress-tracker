"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Save,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trophy,
  RotateCcw,
  Search,
  X,
  Activity,
  Layers,
} from "lucide-react";
import {
  db,
  LocalExercise,
  SessionDetailData,
  SetType,
  updateWorkoutSessionWithSets,
  deleteWorkoutSession,
  getSessionDetail,
  EditSetInput,
  isCardioExercise,
  isBodyweightExercise,
  getLatestBodyWeightLog,
} from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface WorkingSet {
  tempId: string;
  originalId?: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  setType: SetType;
  isCompleted: boolean;
}

interface WorkingGroup {
  exercise: LocalExercise;
  sets: WorkingSet[];
}

const SET_TYPES: Array<{
  value: SetType;
  label: string;
  badge: string;
  activeColor: string;
  pillColor: string;
}> = [
  {
    value: "NORMAL",
    label: "Normal",
    badge: "N",
    activeColor: "bg-zinc-800 text-zinc-100 border-zinc-700",
    pillColor: "text-zinc-300",
  },
  {
    value: "WARMUP",
    label: "Warmup",
    badge: "W",
    activeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    pillColor: "text-amber-400",
  },
  {
    value: "DROPSET",
    label: "Drop",
    badge: "D",
    activeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    pillColor: "text-purple-400",
  },
  {
    value: "FAILURE",
    label: "Failure",
    badge: "F",
    activeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    pillColor: "text-red-400",
  },
];

export default function EditWorkoutSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [sessionDetail, setSessionDetail] = useState<SessionDetailData | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [userBodyWeight, setUserBodyWeight] = useState(58.3);
  const [isSaving, setIsSaving] = useState(false);

  // Drawer / Add Exercise State
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [allExercises, setAllExercises] = useState<LocalExercise[]>([]);
  const [searchExerciseQuery, setSearchExerciseQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 1. Fetch Session and User Bodyweight
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!sessionId) return;
      try {
        setIsLoading(true);
        const [detail, latestWeight, exercisesList] = await Promise.all([
          getSessionDetail(sessionId),
          getLatestBodyWeightLog(),
          db.exercises.toArray(),
        ]);

        if (cancelled) return;

        if (latestWeight?.weight) {
          setUserBodyWeight(latestWeight.weight);
        }
        setAllExercises(exercisesList);

        if (detail) {
          setSessionDetail(detail);
          setTitle(detail.session.title);

          try {
            const d = new Date(detail.session.startTime);
            const pad = (n: number) => String(n).padStart(2, "0");
            const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate()
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setDateTimeLocal(formatted);
          } catch {
            setDateTimeLocal("");
          }

          setDurationMinutes(
            Math.max(1, Math.round((detail.session.durationSec || 0) / 60))
          );

          const initialGroups: WorkingGroup[] = detail.exerciseGroups.map((eg) => ({
            exercise: eg.exercise,
            sets: eg.sets.map((s, idx) => ({
              tempId: s.id || `set-${eg.exercise.id}-${idx}`,
              originalId: s.id,
              setNumber: idx + 1,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe ?? null,
              setType: s.setType,
              isCompleted: s.isCompleted,
            })),
          }));
          setGroups(initialGroups);
        } else {
          setSessionDetail(null);
        }
      } catch (err) {
        console.error("Failed to load session details:", err);
        toast.error("Could not load workout details");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Dynamic KPI Stats Preview
  const { totalVolumePreview, totalCompletedSets, totalExercisesCount } = useMemo(() => {
    let volume = 0;
    let completedSets = 0;

    for (const g of groups) {
      const isCardio = isCardioExercise(g.exercise);
      for (const s of g.sets) {
        if (s.isCompleted) {
          completedSets++;
          if (!isCardio) {
            volume += Number(s.weight || 0) * Number(s.reps || 0);
          }
        }
      }
    }

    return {
      totalVolumePreview: Math.round(volume),
      totalCompletedSets: completedSets,
      totalExercisesCount: groups.length,
    };
  }, [groups]);

  // Set Handlers
  const handleUpdateSet = (
    groupIndex: number,
    setIndex: number,
    updates: Partial<WorkingSet>
  ) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const s = { ...g.sets[setIndex], ...updates };
      g.sets = [...g.sets];
      g.sets[setIndex] = s;
      next[groupIndex] = g;
      return next;
    });
  };

  const handleCycleSetType = (groupIndex: number, setIndex: number) => {
    const current = groups[groupIndex]?.sets[setIndex]?.setType || "NORMAL";
    const typeOrder: SetType[] = ["NORMAL", "WARMUP", "DROPSET", "FAILURE"];
    const nextIdx = (typeOrder.indexOf(current) + 1) % typeOrder.length;
    handleUpdateSet(groupIndex, setIndex, { setType: typeOrder[nextIdx] });
  };

  const handleAddSet = (groupIndex: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const isCardio = isCardioExercise(g.exercise);
      const isBw = isBodyweightExercise(g.exercise);
      const lastSet = g.sets[g.sets.length - 1];
      const nextNum = g.sets.length + 1;

      const newSet: WorkingSet = {
        tempId: `set-${g.exercise.id}-add-${Date.now()}-${nextNum}`,
        setNumber: nextNum,
        weight: lastSet
          ? lastSet.weight
          : isCardio
          ? 1.0
          : isBw
          ? userBodyWeight
          : 20,
        reps: lastSet ? lastSet.reps : 10,
        rpe: lastSet ? (lastSet.rpe ?? (isCardio ? 5 : null)) : (isCardio ? 5 : null),
        setType: "NORMAL",
        isCompleted: true,
      };

      g.sets = [...g.sets, newSet];
      next[groupIndex] = g;
      return next;
    });
  };

  const handleRemoveSet = (groupIndex: number, setIndex: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      const filtered = g.sets.filter((_, idx) => idx !== setIndex);
      g.sets = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      next[groupIndex] = g;
      return next;
    });
  };

  const handleRemoveExercise = (groupIndex: number) => {
    setGroups((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;
    setGroups((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleAddExerciseToSession = (exercise: LocalExercise) => {
    if (groups.some((g) => g.exercise.id === exercise.id)) {
      toast.error("Exercise is already in this workout");
      return;
    }

    const isCardio = isCardioExercise(exercise);
    const isBodyweight = isBodyweightExercise(exercise);
    const defaultWeight = isCardio ? 1.0 : isBodyweight ? userBodyWeight : 20;

    const defaultSets: WorkingSet[] = [
      {
        tempId: `set-${exercise.id}-1-${Date.now()}`,
        setNumber: 1,
        weight: defaultWeight,
        reps: 10,
        rpe: isCardio ? 5 : null,
        setType: "NORMAL",
        isCompleted: true,
      },
      {
        tempId: `set-${exercise.id}-2-${Date.now()}`,
        setNumber: 2,
        weight: defaultWeight,
        reps: 10,
        rpe: isCardio ? 5 : null,
        setType: "NORMAL",
        isCompleted: true,
      },
      {
        tempId: `set-${exercise.id}-3-${Date.now()}`,
        setNumber: 3,
        weight: defaultWeight,
        reps: 10,
        rpe: isCardio ? 5 : null,
        setType: "NORMAL",
        isCompleted: true,
      },
    ];

    setGroups((prev) => [...prev, { exercise, sets: defaultSets }]);
    setShowAddExerciseModal(false);
    toast.success(`Added "${exercise.name}" to workout`);
  };

  const handleLoadRoutineExercises = async () => {
    if (!sessionDetail?.session?.routineId) return;
    try {
      const routineItems = await db.routineItems
        .where("routineId")
        .equals(sessionDetail.session.routineId)
        .sortBy("orderIndex");

      if (routineItems.length === 0) {
        toast.error("No exercises found in routine template");
        return;
      }

      const exIds = routineItems.map((r) => r.exerciseId);
      const exercises = await db.exercises.where("id").anyOf(exIds).toArray();
      const exMap = new Map(exercises.map((e) => [e.id, e]));

      const loadedGroups: WorkingGroup[] = [];
      for (const item of routineItems) {
        const ex = exMap.get(item.exerciseId);
        if (!ex) continue;
        const isCardio = isCardioExercise(ex);
        const isBodyweight = isBodyweightExercise(ex);
        const count = item.targetSets || (isCardio ? 1 : 3);
        const sets: WorkingSet[] = [];

        for (let i = 1; i <= count; i++) {
          sets.push({
            tempId: `set-${ex.id}-${i}-${Date.now()}`,
            setNumber: i,
            weight: isCardio ? 1.0 : isBodyweight ? userBodyWeight : 20,
            reps: 10,
            rpe: isCardio ? 5 : null,
            setType: "NORMAL",
            isCompleted: true,
          });
        }
        loadedGroups.push({ exercise: ex, sets });
      }

      setGroups(loadedGroups);
      toast.success(`Loaded ${loadedGroups.length} movements from routine template`);
    } catch (err) {
      console.error("Failed to load routine exercises:", err);
      toast.error("Failed to load routine movements");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionDetail) return;

    if (!title.trim()) {
      toast.error("Please provide a workout title");
      return;
    }

    if (groups.length === 0) {
      toast.error("Workout must have at least one exercise");
      return;
    }

    try {
      setIsSaving(true);

      const parsedStartTime = dateTimeLocal
        ? new Date(dateTimeLocal).toISOString()
        : sessionDetail.session.startTime;
      const durationSec = Math.max(60, durationMinutes * 60);

      const flatSets: EditSetInput[] = [];
      for (const g of groups) {
        for (const s of g.sets) {
          flatSets.push({
            id: s.originalId,
            exerciseId: g.exercise.id,
            setNumber: s.setNumber,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            rpe: s.rpe !== undefined ? s.rpe : null,
            setType: s.setType,
            isCompleted: s.isCompleted,
          });
        }
      }

      await updateWorkoutSessionWithSets({
        id: sessionDetail.session.id,
        title: title.trim(),
        startTime: parsedStartTime,
        durationSec,
        sets: flatSets,
      });

      toast.success("Workout updated successfully! 🎉");
      router.push("/history");
    } catch (err) {
      console.error("Failed to update workout session:", err);
      toast.error("Failed to update workout session");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;
    try {
      await deleteWorkoutSession(sessionId);
      toast.success("Workout session deleted");
      router.push("/history");
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast.error("Failed to delete session");
    }
  };

  // Filter exercises for Add Exercise Drawer
  const filteredExercises = useMemo(() => {
    const q = searchExerciseQuery.toLowerCase().trim();
    const existingIds = new Set(groups.map((g) => g.exercise.id));
    return allExercises.filter(
      (ex) =>
        !existingIds.has(ex.id) &&
        (ex.name.toLowerCase().includes(q) ||
          ex.primaryMuscle.toLowerCase().includes(q) ||
          (ex.category && ex.category.toLowerCase().includes(q)))
    );
  }, [allExercises, groups, searchExerciseQuery]);

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 gap-3">
        <Dumbbell className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-zinc-400">
          Loading Workout Session...
        </p>
      </div>
    );
  }

  // Not Found State
  if (!sessionDetail) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Dumbbell className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-black text-zinc-100">Workout Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1">
            This workout session could not be found or was already deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider"
        >
          Return to History
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
            onClick={() => router.push("/history")}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors shrink-0 active:scale-95"
            title="Back to History"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-100 truncate">
              Edit Workout
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium block truncate">
              Update exercises, sets, weights & time
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors active:scale-95"
            title="Delete this workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-3 sm:p-4 space-y-4 flex-1">
        {/* 2. Executive Workout Meta Card */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/95 via-zinc-900/75 to-zinc-950/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Workout Title Input */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Workout Session Title</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-500">Required</span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Push Intensity"
              className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/80 rounded-2xl text-base sm:text-lg font-black text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          {/* Date, Time & Duration Segment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
            {/* Date & Time Picker */}
            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={dateTimeLocal}
                onChange={(e) => setDateTimeLocal(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-zinc-100 outline-none"
              />
            </div>

            {/* Duration (Minutes) Stepper */}
            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duration</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-cyan-400">
                  {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDurationMinutes((m) => Math.max(5, m - 5))}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  -5
                </button>
                <div className="flex-1 flex items-center justify-center bg-zinc-900/80 border border-zinc-800 rounded-xl h-8 px-2">
                  <input
                    type="number"
                    min="1"
                    value={durationMinutes || ""}
                    onChange={(e) =>
                      setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))
                    }
                    className="w-14 text-center font-mono font-bold text-xs text-zinc-100 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-semibold text-zinc-500">mins</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDurationMinutes((m) => m + 5)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time KPI Stats Banner */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/70 relative z-10">
            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-emerald-400" />
                Volume
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-0.5">
                {totalVolumePreview.toLocaleString()}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">kg</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Check className="w-3 h-3 text-zinc-400" />
                Completed
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-zinc-200 mt-0.5">
                {totalCompletedSets}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">sets</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                Movements
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-purple-300 mt-0.5">
                {totalExercisesCount}
                <span className="text-[10px] font-bold text-zinc-500 ml-0.5">ex</span>
              </span>
            </div>
          </div>
        </section>

        {/* 3. Section Header: Movements & Sets */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Exercises & Sets ({groups.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {sessionDetail.session.routineId && (
              <button
                type="button"
                onClick={handleLoadRoutineExercises}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Reload exercises from original routine template"
              >
                <RotateCcw className="w-3 h-3 text-emerald-400" />
                <span className="hidden xs:inline">Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchExerciseQuery("");
                setShowAddExerciseModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exercise</span>
            </button>
          </div>
        </div>

        {/* 4. Exercise Groups List */}
        {groups.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl p-6 flex flex-col items-center gap-3 bg-zinc-900/30">
            <Dumbbell className="w-10 h-10 text-zinc-600" />
            <div>
              <p className="font-bold text-zinc-300 text-sm">No exercises in this workout</p>
              <p className="text-xs text-zinc-500 mt-1">
                Add movements to keep your training history accurate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddExerciseModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Movement</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, groupIdx) => {
              const isCardio = isCardioExercise(group.exercise);
              const isBw = isBodyweightExercise(group.exercise);

              return (
                <section
                  key={group.exercise.id}
                  className={`rounded-3xl border p-3.5 sm:p-4 space-y-3.5 shadow-xl transition-all ${
                    isCardio
                      ? "bg-zinc-900/70 border-cyan-900/40"
                      : "bg-zinc-900/65 border-zinc-800/80"
                  }`}
                >
                  {/* Exercise Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCardio
                            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {isCardio ? (
                          <Activity className="w-4 h-4" />
                        ) : (
                          <Dumbbell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-zinc-100 truncate">
                          {group.exercise.name}
                        </h3>
                        <span className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                          {isCardio ? (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[9px]">
                              Cardio Movement
                            </span>
                          ) : (
                            <>
                              <span className="uppercase text-zinc-500 font-semibold">
                                {group.exercise.category}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">
                                {group.exercise.primaryMuscle}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Exercise Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(groupIdx, "up")}
                          disabled={groupIdx === 0}
                          className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(groupIdx, "down")}
                          disabled={groupIdx === groups.length - 1}
                          className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(groupIdx)}
                        className="w-8 h-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0"
                        title="Remove movement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sets Column Header */}
                  {isCardio ? (
                    <div className="grid grid-cols-[28px_48px_1fr_1fr_1fr_36px_28px] gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-400/80 items-center">
                      <span className="text-center">Rnd</span>
                      <span className="text-center">Type</span>
                      <span className="text-center">Time (m)</span>
                      <span className="text-center">Dist (k)</span>
                      <span className="text-center text-purple-400">Resist</span>
                      <span className="text-center">Done</span>
                      <span></span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[28px_50px_1fr_1fr_36px_28px] gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 items-center">
                      <span className="text-center">Set</span>
                      <span className="text-center">Type</span>
                      <span className="text-center">Weight</span>
                      <span className="text-center">Reps</span>
                      <span className="text-center">Done</span>
                      <span></span>
                    </div>
                  )}

                  {/* Set Rows */}
                  <div className="space-y-2">
                    {group.sets.map((set, setIdx) => {
                      const typeConfig =
                        SET_TYPES.find((t) => t.value === set.setType) || SET_TYPES[0];

                      return (
                        <div
                          key={set.tempId}
                          className={`rounded-2xl border transition-all p-1.5 sm:p-2 ${
                            set.isCompleted
                              ? "bg-zinc-950/70 border-zinc-800/90"
                              : "bg-zinc-950/30 border-zinc-900 opacity-60"
                          } ${
                            isCardio
                              ? "grid grid-cols-[28px_48px_1fr_1fr_1fr_36px_28px]"
                              : "grid grid-cols-[28px_50px_1fr_1fr_36px_28px]"
                          } gap-1.5 items-center`}
                        >
                          {/* 1. Set # */}
                          <div className="flex items-center justify-center font-mono font-bold text-xs text-zinc-400">
                            {set.setNumber}
                          </div>

                          {/* 2. Interactive Type Pill Button (Cycles between Normal, Warmup, Drop, Failure) */}
                          <button
                            type="button"
                            onClick={() => handleCycleSetType(groupIdx, setIdx)}
                            className={`h-8 rounded-xl font-black text-[10px] uppercase tracking-wider border flex items-center justify-center transition-all active:scale-95 ${typeConfig.activeColor}`}
                            title={`Current: ${typeConfig.label}. Tap to cycle type.`}
                          >
                            <span>{typeConfig.badge}</span>
                          </button>

                          {/* 3 & 4. Inputs */}
                          {isCardio ? (
                            <>
                              {/* Duration Mins */}
                              <div className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-cyan-500/80 px-1.5 flex items-center justify-between transition-colors min-w-0">
                                <input
                                  type="number"
                                  min="0"
                                  value={set.reps === 0 ? "" : set.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      reps: Math.max(0, parseInt(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full text-center bg-transparent font-mono font-bold text-xs sm:text-sm text-cyan-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="10"
                                />
                                <span className="text-[9px] font-bold text-zinc-500">m</span>
                              </div>

                              {/* Distance Km */}
                              <div className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-emerald-500/80 px-1.5 flex items-center justify-between transition-colors min-w-0">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={set.weight === 0 ? "" : set.weight}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      weight: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full text-center bg-transparent font-mono font-bold text-xs sm:text-sm text-emerald-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="1.0"
                                />
                                <span className="text-[9px] font-bold text-zinc-500">k</span>
                              </div>

                              {/* Resistance Level */}
                              <div className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-purple-500/80 px-1.5 flex items-center justify-between transition-colors min-w-0">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={set.rpe ?? 1}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      rpe: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full text-center bg-transparent font-mono font-bold text-xs sm:text-sm text-purple-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="1"
                                />
                                <span className="text-[9px] font-bold text-zinc-500">L</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Weight Input with BW Toggle */}
                              <div className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-emerald-500/80 px-1.5 flex items-center justify-between transition-colors min-w-0 relative">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={set.weight === 0 ? "" : set.weight}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      weight: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full text-center bg-transparent font-mono font-bold text-xs sm:text-sm text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                />
                                <span className="text-[9px] font-bold text-zinc-500 ml-0.5">
                                  kg
                                </span>

                                {isBw && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSet(groupIdx, setIdx, {
                                        weight:
                                          Math.abs(set.weight - userBodyWeight) < 0.1
                                            ? 0
                                            : userBodyWeight,
                                      })
                                    }
                                    title={`Toggle Body Weight (${userBodyWeight}kg)`}
                                    className={`text-[8px] font-black px-1 py-0.5 rounded ml-1 transition-all shrink-0 ${
                                      Math.abs(set.weight - userBodyWeight) < 0.1
                                        ? "bg-emerald-500 text-zinc-950 font-black shadow-sm shadow-emerald-500/20"
                                        : "bg-zinc-800 text-zinc-400 hover:text-emerald-400"
                                    }`}
                                  >
                                    BW
                                  </button>
                                )}
                              </div>

                              {/* Reps Input */}
                              <div className="h-8 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-emerald-500/80 px-1.5 flex items-center justify-between transition-colors min-w-0">
                                <input
                                  type="number"
                                  min="0"
                                  value={set.reps === 0 ? "" : set.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(groupIdx, setIdx, {
                                      reps: Math.max(0, parseInt(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full text-center bg-transparent font-mono font-bold text-xs sm:text-sm text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                />
                                <span className="text-[9px] font-bold text-zinc-500 ml-0.5">
                                  r
                                </span>
                              </div>
                            </>
                          )}

                          {/* 5. Completion Toggle Checkmark */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSet(groupIdx, setIdx, {
                                isCompleted: !set.isCompleted,
                              })
                            }
                            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                              set.isCompleted
                                ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/25"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-zinc-400"
                            }`}
                            title={set.isCompleted ? "Set Completed" : "Mark Pending"}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          {/* 6. Delete Set */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(groupIdx, setIdx)}
                            className="w-7 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Set to Movement Button */}
                  <button
                    type="button"
                    onClick={() => handleAddSet(groupIdx)}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-950/40 hover:bg-zinc-900/50 text-zinc-400 hover:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Set</span>
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. Fixed Sticky Bottom Action Dock */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 p-3 sm:p-4">
        <div className="w-full max-w-lg mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors active:scale-95 text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex-[2] py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaving ? "Saving..." : "Save Workout Changes"}</span>
          </button>
        </div>
      </footer>

      {/* Add Movement Modal Drawer */}
      {showAddExerciseModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddExerciseModal(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-zinc-100">Add Movement</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExerciseModal(false)}
                className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 pb-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search movement name or muscle..."
                  value={searchExerciseQuery}
                  onChange={(e) => setSearchExerciseQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">
                  No matching exercises found.
                </div>
              ) : (
                filteredExercises.slice(0, 30).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleAddExerciseToSession(ex)}
                    className="w-full text-left p-3 rounded-xl border bg-zinc-950/70 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-850/50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-200">{ex.name}</span>
                      <span className="text-xs text-zinc-400">
                        {ex.category} •{" "}
                        <span className="text-emerald-400/90">{ex.primaryMuscle}</span>
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Workout Session?"
        description="Are you sure you want to delete this workout session? This will remove all recorded volume and sets and cannot be undone."
        confirmLabel="Delete Workout"
        cancelLabel="Keep Session"
        variant="danger"
        onConfirm={() => void handleDeleteSession()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
