"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Trophy,
  Activity,
  ChevronDown,
} from "lucide-react";
import {
  db,
  LocalExercise,
  LocalSetLog,
  LocalWorkoutSession,
  initializeLocalDb,
  formatLocalDate,
} from "@/lib/db/dexie";
import { calculate1RM } from "@/lib/utils/pr-calculator";

interface MuscleSetCount {
  muscle: string;
  count: number;
  percentage: number;
}

interface WeekVolume {
  weekLabel: string;
  volumeKg: number;
  workoutCount: number;
  startDate: Date;
}

interface Exercise1RMPoint {
  dateStr: string;
  e1rm: number;
  weight: number;
  reps: number;
}

interface PRAchievement {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  max1RM: number;
  unlockedDate: string;
}

const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Quadriceps",
  "Hamstrings",
  "Triceps",
  "Biceps",
  "Calves",
];

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<LocalWorkoutSession[]>([]);
  const [completedSets, setCompletedSets] = useState<LocalSetLog[]>([]);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Heatmap timeframe: "week" (This Week) vs "month" (Last 30 Days)
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<"week" | "month">("month");

  // Selected exercise for 1RM curve
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");

  // Selected bar for weekly volume detail
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        await initializeLocalDb();
        const [allSessions, allSets, allEx] = await Promise.all([
          db.workoutSessions.where("status").equals("COMPLETED").toArray(),
          db.setLogs.filter((s) => s.isCompleted).toArray(),
          db.exercises.toArray(),
        ]);

        setSessions(allSessions);
        setCompletedSets(allSets);
        setExercises(allEx);

        // Default selected exercise to Bench Press or first available exercise
        const defaultEx =
          allEx.find((e) => e.name.toLowerCase().includes("bench")) || allEx[0];
        if (defaultEx) {
          setSelectedExerciseId(defaultEx.id);
        }
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const exMap = useMemo(() => {
    return new Map(exercises.map((e) => [e.id, e]));
  }, [exercises]);

  // 1. Weekly Volume Trend for the last 8 weeks
  const weeklyVolumeData = useMemo<WeekVolume[]>(() => {
    const weeks: WeekVolume[] = [];
    const now = new Date();

    // Generate 8 weeks backwards
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i * 7 - now.getDay() + 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const weekSessions = sessions.filter((s) => {
        const d = new Date(s.startTime);
        return d >= start && d < end;
      });

      const totalVol = weekSessions.reduce((acc, s) => acc + s.totalVolume, 0);
      const label = i === 0 ? "This Wk" : `W-${i}`;

      weeks.push({
        weekLabel: label,
        volumeKg: Math.round(totalVol),
        workoutCount: weekSessions.length,
        startDate: start,
      });
    }

    return weeks;
  }, [sessions]);

  const maxWeeklyVol = useMemo(() => {
    const max = Math.max(...weeklyVolumeData.map((w) => w.volumeKg));
    return max > 0 ? max : 1000;
  }, [weeklyVolumeData]);

  // 2. Muscle Volume Heatmap
  const muscleHeatmapData = useMemo<MuscleSetCount[]>(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (heatmapTimeframe === "week") {
      cutoff.setDate(now.getDate() - 7);
    } else {
      cutoff.setDate(now.getDate() - 30);
    }

    const filteredSets = completedSets.filter((s) => new Date(s.createdAt) >= cutoff);

    const counts: Record<string, number> = {};
    for (const m of MUSCLE_GROUPS) {
      counts[m] = 0;
    }

    for (const s of filteredSets) {
      const ex = exMap.get(s.exerciseId);
      if (!ex) continue;

      if (counts[ex.primaryMuscle] !== undefined) {
        counts[ex.primaryMuscle] += 1;
      }
    }

    const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

    return MUSCLE_GROUPS.map((m) => {
      const count = counts[m] || 0;
      return {
        muscle: m,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      };
    }).sort((a, b) => b.count - a.count);
  }, [completedSets, exMap, heatmapTimeframe]);

  const maxMuscleCount = useMemo(() => {
    const max = Math.max(...muscleHeatmapData.map((m) => m.count));
    return max > 0 ? max : 1;
  }, [muscleHeatmapData]);

  // 3. 1RM Progression Curve for selected exercise
  const exercise1RMHistory = useMemo<Exercise1RMPoint[]>(() => {
    if (!selectedExerciseId) return [];

    const exSets = completedSets
      .filter((s) => s.exerciseId === selectedExerciseId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (exSets.length === 0) return [];

    // Group by session/date and record max 1RM achieved
    const dateMap = new Map<string, { e1rm: number; weight: number; reps: number }>();

    for (const s of exSets) {
      const dateKey = formatLocalDate(new Date(s.createdAt));
      const e1rm = calculate1RM(s.weight, s.reps);
      const current = dateMap.get(dateKey);

      if (!current || e1rm > current.e1rm) {
        dateMap.set(dateKey, { e1rm, weight: s.weight, reps: s.reps });
      }
    }

    return Array.from(dateMap.entries()).map(([dateStr, val]) => ({
      dateStr,
      e1rm: val.e1rm,
      weight: val.weight,
      reps: val.reps,
    }));
  }, [completedSets, selectedExerciseId]);

  // 4. All-Time PR Wall
  const prWallData = useMemo<PRAchievement[]>(() => {
    const recordsMap = new Map<
      string,
      { maxWeight: number; maxReps: number; max1RM: number; unlockedDate: string }
    >();

    for (const s of completedSets) {
      const e1rm = calculate1RM(s.weight, s.reps);
      const current = recordsMap.get(s.exerciseId);

      if (!current) {
        recordsMap.set(s.exerciseId, {
          maxWeight: s.weight,
          maxReps: s.reps,
          max1RM: e1rm,
          unlockedDate: s.createdAt,
        });
      } else {
        const isBetter = e1rm > current.max1RM;
        recordsMap.set(s.exerciseId, {
          maxWeight: Math.max(current.maxWeight, s.weight),
          maxReps: Math.max(current.maxReps, s.reps),
          max1RM: Math.max(current.max1RM, e1rm),
          unlockedDate: isBetter ? s.createdAt : current.unlockedDate,
        });
      }
    }

    return Array.from(recordsMap.entries())
      .map(([exId, stats]) => ({
        exerciseId: exId,
        exerciseName: exMap.get(exId)?.name || "Exercise",
        maxWeight: stats.maxWeight,
        maxReps: stats.maxReps,
        max1RM: stats.max1RM,
        unlockedDate: stats.unlockedDate,
      }))
      .filter((item) => item.max1RM > 0)
      .sort((a, b) => b.max1RM - a.max1RM);
  }, [completedSets, exMap]);

  const totalVolumeLifetime = useMemo(() => {
    return sessions.reduce((acc, s) => acc + s.totalVolume, 0);
  }, [sessions]);

  return (
    <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 md:pb-12 min-w-0 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Header */}
      <header className="px-5 md:px-8 pt-6 pb-4 border-b border-zinc-900/80 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-100">Performance</h1>
            <span className="text-[11px] text-zinc-500 font-semibold">
              Volume & 1RM Progression
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-400 font-mono font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>{totalVolumeLifetime.toLocaleString()} kg</span>
        </div>
      </header>

      {/* Main Analytics Content */}
      <main className="p-5 md:px-8 space-y-6 flex-1">
        {isLoading ? (
          <div className="py-24 text-center text-zinc-500 text-xs">
            Calculating performance metrics...
          </div>
        ) : (
          <>
            {/* Top Grid: Weekly Volume Trend & Muscle Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Weekly Volume Trend (Interactive Bar Chart) */}
            <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Weekly Volume Trend
                  </h2>
                  <span className="text-[10px] text-zinc-500">Last 8 Weeks (kg moved)</span>
                </div>
                {selectedWeekIdx !== null && (
                  <div className="text-right animate-in fade-in">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      {weeklyVolumeData[selectedWeekIdx].volumeKg.toLocaleString()} kg
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      {weeklyVolumeData[selectedWeekIdx].workoutCount} workout
                      {weeklyVolumeData[selectedWeekIdx].workoutCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Bar Chart Container */}
              <div className="h-36 pt-4 flex items-end justify-between gap-1.5 border-b border-zinc-800/60 pb-2">
                {weeklyVolumeData.map((item, index) => {
                  const heightPercent =
                    maxWeeklyVol > 0
                      ? Math.max(6, Math.round((item.volumeKg / maxWeeklyVol) * 100))
                      : 6;
                  const isSelected = selectedWeekIdx === index;

                  return (
                    <button
                      key={item.weekLabel}
                      type="button"
                      onClick={() => setSelectedWeekIdx(index)}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer focus:outline-none"
                    >
                      <div className="w-full relative flex items-end justify-center h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                            isSelected
                              ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                              : item.volumeKg > 0
                              ? "bg-emerald-500/50 hover:bg-emerald-400/80"
                              : "bg-zinc-800/60"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[9px] font-mono whitespace-nowrap transition-colors ${
                          isSelected
                            ? "text-emerald-400 font-bold"
                            : "text-zinc-500 group-hover:text-zinc-300"
                        }`}
                      >
                        {item.weekLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                <span>Tap any bar to inspect volume</span>
                <span className="font-mono text-zinc-400">Peak: {maxWeeklyVol.toLocaleString()} kg</span>
              </div>
            </section>

            {/* 2. Muscle Volume Heatmap */}
            <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Muscle Volume Heatmap
                  </h2>
                  <span className="text-[10px] text-zinc-500">Distribution of logged sets</span>
                </div>

                {/* Timeframe Toggle Buttons */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setHeatmapTimeframe("week")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      heatmapTimeframe === "week"
                        ? "bg-emerald-500 text-zinc-950"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapTimeframe("month")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      heatmapTimeframe === "month"
                        ? "bg-emerald-500 text-zinc-950"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="grid grid-cols-2 gap-2">
                {muscleHeatmapData.map((item) => {
                  const intensityRatio = maxMuscleCount > 0 ? item.count / maxMuscleCount : 0;
                  // Color gradient steps based on volume intensity
                  const bgClass =
                    item.count === 0
                      ? "bg-zinc-950/60 border-zinc-800/50 text-zinc-500"
                      : intensityRatio > 0.7
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                      : intensityRatio > 0.35
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300";

                  return (
                    <div
                      key={item.muscle}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${bgClass}`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{item.muscle}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.percentage}% share
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black font-mono block">
                          {item.count}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-semibold">
                          sets
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            </div>

            {/* Bottom Grid: 1RM Progression Curve & PR Wall */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* 3. 1RM Progression Curve (SVG Vector Line Graph) */}
            <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    1RM Progression Curve
                  </h2>
                  <span className="text-[10px] text-zinc-500">Brzycki formula over time</span>
                </div>

                {/* Compound Exercise Selector */}
                <div className="relative">
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 py-1.5 px-3 pr-8 rounded-xl appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[150px] truncate"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Line Graph Display */}
              {exercise1RMHistory.length < 2 ? (
                <div className="py-10 text-center border border-dashed border-zinc-800/80 rounded-xl p-4">
                  <p className="text-xs text-zinc-400 font-semibold">
                    {exercise1RMHistory.length === 1
                      ? `Single session recorded (${exercise1RMHistory[0].e1rm}kg e1RM). Log another workout to plot curve.`
                      : "No completed sets recorded for this movement yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* SVG Chart */}
                  <div className="w-full bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-3">
                    {(() => {
                      const min1RM = Math.min(...exercise1RMHistory.map((p) => p.e1rm));
                      const max1RM = Math.max(...exercise1RMHistory.map((p) => p.e1rm));
                      const range = max1RM - min1RM > 0 ? max1RM - min1RM : 10;
                      const width = 320;
                      const height = 120;
                      const padding = 20;

                      // Map points to SVG coordinates
                      const points = exercise1RMHistory.map((pt, idx) => {
                        const x =
                          padding +
                          (idx / (exercise1RMHistory.length - 1)) * (width - 2 * padding);
                        const y =
                          height -
                          padding -
                          ((pt.e1rm - min1RM) / range) * (height - 2 * padding);
                        return { ...pt, x, y };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, "");

                      // Area fill under line
                      const areaD = `${pathD} L ${points[points.length - 1].x} ${
                        height - padding
                      } L ${points[0].x} ${height - padding} Z`;

                      const first = exercise1RMHistory[0].e1rm;
                      const latest = exercise1RMHistory[exercise1RMHistory.length - 1].e1rm;
                      const delta = Math.round((latest - first) * 10) / 10;
                      const pctDelta = first > 0 ? Math.round((delta / first) * 100) : 0;

                      return (
                        <>
                          <div className="flex items-center justify-between pb-2 text-[11px] font-mono">
                            <span className="text-zinc-500">
                              Start: <span className="text-zinc-300 font-bold">{first}kg</span>
                            </span>
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                delta >= 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta} kg ({pctDelta >= 0 ? "+" : ""}
                              {pctDelta}%)
                            </span>
                            <span className="text-zinc-500">
                              Current: <span className="text-emerald-400 font-bold">{latest}kg</span>
                            </span>
                          </div>

                          <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className="w-full h-28 overflow-visible"
                          >
                            <defs>
                              <linearGradient
                                id="curveGradient"
                                x1="0%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                              >
                                <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Grid Lines */}
                            <line
                              x1={padding}
                              y1={padding}
                              x2={width - padding}
                              y2={padding}
                              stroke="#27272a"
                              strokeDasharray="3 3"
                            />
                            <line
                              x1={padding}
                              y1={height - padding}
                              x2={width - padding}
                              y2={height - padding}
                              stroke="#27272a"
                            />

                            {/* Area fill */}
                            <path d={areaD} fill="url(#curveGradient)" />

                            {/* Line path */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#34d399"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Data points */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  className="fill-zinc-950 stroke-emerald-400 stroke-2"
                                />
                              </g>
                            ))}
                          </svg>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </section>

            {/* 4. All-Time Personal Records (PR) Wall */}
            <section className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  All-Time PR Wall of Fame
                </h2>
              </div>

              {prWallData.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">No PR records logged yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                  {prWallData.map((pr) => {
                    const unlockDateFormatted = new Date(pr.unlockedDate).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" }
                    );

                    return (
                      <div
                        key={pr.exerciseId}
                        className="bg-zinc-900/80 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-sm transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Trophy className="w-5 h-5 fill-amber-500/20" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xs text-zinc-100 group-hover:text-amber-300 transition-colors">
                              {pr.exerciseName}
                            </h3>
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              Unlocked {unlockDateFormatted}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black font-mono text-amber-400">
                              {pr.max1RM}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                              kg 1RM
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Best: {pr.maxWeight}kg × {pr.maxReps}r
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
