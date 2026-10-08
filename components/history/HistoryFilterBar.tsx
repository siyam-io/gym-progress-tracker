import React from "react";
import { ListFilter, CalendarDays, Search, X } from "lucide-react";

interface HistoryFilterBarProps {
  viewMode: "feed" | "calendar";
  setViewMode: (mode: "feed" | "calendar") => void;
  sessionsCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (muscle: string) => void;
}

const MUSCLE_CATEGORIES = ["All", "Chest", "Back", "Shoulders", "Legs", "Arms", "Core"];

export function HistoryFilterBar({
  viewMode,
  setViewMode,
  sessionsCount,
  searchQuery,
  setSearchQuery,
  selectedMuscleFilter,
  setSelectedMuscleFilter,
}: HistoryFilterBarProps) {
  return (
    <div className="w-full space-y-3">
      {/* View Toggle */}
      <section className="w-full flex items-center justify-between gap-2">
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full">
          <button
            type="button"
            onClick={() => setViewMode("feed")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "feed"
                ? "bg-emerald-500 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Workouts Log ({sessionsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "calendar"
                ? "bg-emerald-500 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>
      </section>

      {/* Search & Fast Filters */}
      <section className="w-full space-y-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by workout or exercise (e.g. Bench, Push)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Muscle Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full">
          {MUSCLE_CATEGORIES.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscleFilter(muscle)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                selectedMuscleFilter === muscle
                  ? "bg-zinc-800 text-emerald-400 border border-emerald-500/40"
                  : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
