import React from "react";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { CalendarDayItem, getLocalDateKey } from "@/hooks/useWorkoutHistory";

interface HistoryCalendarProps {
  currentMonthDate: Date;
  setCurrentMonthDate: (date: Date) => void;
  calendarDays: CalendarDayItem[];
  selectedDateFilter: string | null;
  setSelectedDateFilter: (date: string | null) => void;
  workoutDatesCount: number;
}

function formatFriendlyDate(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const todayKey = getLocalDateKey(new Date());

  if (dateKey === todayKey) {
    return `Today, ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HistoryCalendar({
  currentMonthDate,
  setCurrentMonthDate,
  calendarDays,
  selectedDateFilter,
  setSelectedDateFilter,
  workoutDatesCount,
}: HistoryCalendarProps) {
  const monthLabel = currentMonthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-sm text-zinc-100">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => setCurrentMonthDate(new Date())}
            className="px-2 py-0.5 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setCurrentMonthDate(
                new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
              )
            }
            className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentMonthDate(
                new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
              )
            }
            className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-full">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center w-full">
        {calendarDays.map((d, index) => {
          if (!d.isCurrentMonth) {
            return (
              <div
                key={`empty-${index}`}
                className="w-full aspect-square min-h-[38px] max-h-[44px]"
              />
            );
          }

          const isSelected = selectedDateFilter === d.dateKey;

          return (
            <button
              key={d.dateKey}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setSelectedDateFilter(null);
                } else {
                  setSelectedDateFilter(d.dateKey);
                }
              }}
              className={`w-full aspect-square min-h-[38px] max-h-[44px] rounded-xl flex flex-col items-center justify-center relative font-mono text-xs transition-colors duration-150 select-none ${
                isSelected
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950"
                  : d.isToday
                  ? "bg-zinc-800 text-zinc-100 font-bold border border-emerald-500/50"
                  : "bg-zinc-950/60 hover:bg-zinc-800/80 text-zinc-300 border border-transparent"
              }`}
            >
              <span>{d.dayNum}</span>

              {d.hasWorkout && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected
                      ? "bg-zinc-950"
                      : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Footer Status */}
      <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs min-h-[32px]">
        {selectedDateFilter ? (
          <>
            <span className="text-zinc-300 flex items-center gap-1.5 font-medium">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Selected:{" "}
              <span className="font-bold text-emerald-400">
                {formatFriendlyDate(selectedDateFilter)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(null)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              Green dots indicate logged workouts
            </span>
            <span className="font-mono text-zinc-400">
              {workoutDatesCount} active days
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
