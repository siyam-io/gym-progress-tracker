import React from "react";
import {
  Dumbbell,
  Play,
  Trophy,
  Pencil,
  Trash2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { HistoryCardSkeleton } from "@/components/ui/Skeleton";
import { WorkoutHistoryItem } from "@/hooks/useWorkoutHistory";

interface HistoryFeedProps {
  isLoading: boolean;
  filteredSessions: WorkoutHistoryItem[];
  selectedDateFilter: string | null;
  searchQuery: string;
  selectedMuscleFilter: string;
  onClearFilters: () => void;
  onStartNewWorkout: () => void;
  onBrowseRoutines: () => void;
  onInspectSession: (id: string) => void;
  onDirectEdit: (id: string, e: React.MouseEvent) => void;
  onDeleteRequest: (item: WorkoutHistoryItem, e: React.MouseEvent) => void;
  onRepeatWorkout: (item: WorkoutHistoryItem, e: React.MouseEvent) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today • ${timeStr}`;
  if (diffDays === 1) return `Yesterday • ${timeStr}`;
  if (diffDays < 7) {
    const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
    return `${weekday} (${diffDays}d ago) • ${timeStr}`;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HistoryFeed({
  isLoading,
  filteredSessions,
  selectedDateFilter,
  searchQuery,
  selectedMuscleFilter,
  onClearFilters,
  onStartNewWorkout,
  onBrowseRoutines,
  onInspectSession,
  onDirectEdit,
  onDeleteRequest,
  onRepeatWorkout,
}: HistoryFeedProps) {
  return (
    <section className="w-full space-y-3 flex-1">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 w-full">
        <span>
          {selectedDateFilter
            ? `Sessions on ${selectedDateFilter}`
            : `Logged Sessions (${filteredSessions.length})`}
        </span>
        {filteredSessions.length > 0 && (
          <span className="text-[10px] text-zinc-500 lowercase">tap card to inspect</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 w-full">
          <HistoryCardSkeleton />
          <HistoryCardSkeleton />
          <HistoryCardSkeleton />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="w-full text-center py-12 px-6 border border-dashed border-zinc-800/90 rounded-3xl bg-zinc-900/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-600 shadow-xl shadow-emerald-500/5">
            <Dumbbell className="w-8 h-8 text-emerald-400/60" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-zinc-200">
              {selectedDateFilter
                ? `No Workouts on ${selectedDateFilter}`
                : searchQuery || selectedMuscleFilter !== "All"
                ? "No sessions match filter"
                : "No Workout History Yet"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {selectedDateFilter
                ? "Rest day or recovery. Select another highlighted day on the calendar or start a new workout."
                : searchQuery || selectedMuscleFilter !== "All"
                ? "Try adjusting your filters or search terms."
                : "Every set, weight, and personal record you log on the gym floor will appear here."}
            </p>
          </div>

          {selectedDateFilter || searchQuery || selectedMuscleFilter !== "All" ? (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClearFilters}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
              >
                Show All Workouts
              </button>
              <button
                type="button"
                onClick={onStartNewWorkout}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Start Workout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto w-full">
              <button
                type="button"
                onClick={onStartNewWorkout}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>Start Empty Workout</span>
              </button>
              <button
                type="button"
                onClick={onBrowseRoutines}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors"
              >
                Browse Saved Routines
              </button>
            </div>
          )}
        </div>
      ) : (
        filteredSessions.map((item) => (
          <div
            key={item.id}
            onClick={() => onInspectSession(item.id)}
            className="w-full bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/90 rounded-2xl p-4 space-y-3.5 shadow-sm transition-all hover:bg-zinc-900 active:scale-[0.99] cursor-pointer group relative overflow-hidden"
          >
            {/* Top Row: Title, Date & Delete Trigger */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">
                  {item.title}
                </h3>
                <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">
                  {formatRelativeDate(item.startTime)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* PR Count Pill */}
                {item.prCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                    <Trophy className="w-3 h-3 fill-amber-500/20" />
                    <span>
                      {item.prCount} PR{item.prCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* Direct Edit Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => onDirectEdit(item.id, e)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Edit workout details and sets"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Direct Delete Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => onDeleteRequest(item, e)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                  title="Delete workout session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Exercise Breakdown Preview Chips */}
            {item.exercisePreviews.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-zinc-800/60 w-full">
                <div className="flex flex-wrap gap-1.5">
                  {item.exercisePreviews.map((ep) => (
                    <span
                      key={ep.name}
                      className="text-[11px] font-medium px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 flex items-center gap-1.5"
                    >
                      <span className="text-zinc-200 font-bold">{ep.name}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">
                        {ep.setsCount}s
                      </span>
                      {ep.topWeight > 0 && (
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">
                          • {ep.topWeight}kg
                        </span>
                      )}
                    </span>
                  ))}
                </div>

                {item.primaryMuscles.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 pt-0.5">
                    <span className="font-semibold text-zinc-400">Targeted:</span>
                    <span>{item.primaryMuscles.join(" • ")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Row: Metrics & Quick Repeat Action */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs w-full">
              <div className="flex items-center gap-3 text-zinc-400 font-mono font-bold">
                <span className="flex items-center gap-1 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  {formatDuration(item.durationSec)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                  {item.totalVolume.toLocaleString()} kg
                </span>
                <span>•</span>
                <span className="text-zinc-400">{item.completedSetsCount} sets</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => onDirectEdit(item.id, e)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                  title="Edit workout details and sets"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => onRepeatWorkout(item, e)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                  title="Run this workout again on gym floor"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rerun</span>
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
