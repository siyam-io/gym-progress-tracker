"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Scale,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  Calendar,
  History,
  X,
  Trash2,
} from "lucide-react";
import {
  saveBodyWeightLog,
  getBodyWeightStats,
  deleteBodyWeightLog,
  LocalBodyWeightLog,
} from "@/lib/db/dexie";
import { useSession } from "next-auth/react";
import { toast } from "@/stores/useToastStore";

export function DailyWeightCard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<{
    latestWeight: number | null;
    latestDate: string | null;
    weeklyDelta: number | null;
    history: LocalBodyWeightLog[];
  }>({
    latestWeight: null,
    latestDate: null,
    weeklyDelta: null,
    history: [],
  });

  const [showLogModal, setShowLogModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [inputWeight, setInputWeight] = useState<number>(72.0);
  const [inputDate, setInputDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [inputNote, setInputNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const loadWeightData = useCallback(async () => {
    const s = await getBodyWeightStats();
    setStats(s);
    if (s.latestWeight) {
      setInputWeight(s.latestWeight);
    }
  }, []);

  useEffect(() => {
    void loadWeightData();
  }, [loadWeightData]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isLoggedToday = stats.latestDate === todayStr;

  const handleQuickStep = (delta: number) => {
    setInputWeight((prev) => Math.max(20, Math.round((prev + delta) * 10) / 10));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWeight || inputWeight <= 0) return;
    setIsSaving(true);
    try {
      await saveBodyWeightLog({
        weight: inputWeight,
        date: inputDate,
        note: inputNote || undefined,
        userId: session?.user?.id || null,
      });
      await loadWeightData();
      setShowLogModal(false);
      setInputNote("");
      toast.success("Body weight logged! ⚖️");
    } catch (err) {
      console.error("Failed to save body weight:", err);
      toast.error("Failed to save weight entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBodyWeightLog(id);
      await loadWeightData();
      toast.info("Weight log entry removed.");
    } catch (err) {
      console.error("Failed to delete weight log:", err);
      toast.error("Failed to delete weight entry.");
    }
  };

  return (
    <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
      {/* Background glowing accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Daily Body Weight
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">
              {isLoggedToday ? "Checked in today" : "Not logged yet today"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
          title="View Weight History"
        >
          <History className="w-3 h-3 text-emerald-400" />
          <span>History</span>
        </button>
      </div>

      {/* Main Stats Row */}
      <div className="flex items-center justify-between py-2 border-y border-zinc-800/60 my-2 relative z-10">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-zinc-100 font-mono">
              {stats.latestWeight ? stats.latestWeight.toFixed(1) : "--"}
            </span>
            <span className="text-xs font-bold text-zinc-500 uppercase">kg</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            {stats.latestDate
              ? `Last: ${new Date(stats.latestDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}`
              : "No logs recorded"}
          </span>
        </div>

        {/* Weekly Trend delta badge */}
        {stats.weeklyDelta !== null && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
              stats.weeklyDelta <= 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            {stats.weeklyDelta <= 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            <span className="font-mono">
              {stats.weeklyDelta > 0 ? `+${stats.weeklyDelta}` : stats.weeklyDelta} kg
            </span>
            <span className="text-[9px] text-zinc-400 font-normal">7d</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            setInputDate(todayStr);
            setShowLogModal(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
            isLoggedToday
              ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
              : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-emerald-500/20"
          }`}
        >
          {isLoggedToday ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Update</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Log Today</span>
            </>
          )}
        </button>
      </div>

      {/* Mini 7-point visual trend indicator */}
      {stats.history.length > 0 && (
        <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Recent:</span>
          <div className="flex items-center gap-1">
            {stats.history.slice(0, 5).reverse().map((h) => (
              <span
                key={h.id}
                className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                title={`${h.date}: ${h.weight} kg`}
              >
                {h.weight}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log Body Weight Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-zinc-100">
                  Log Body Weight
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Stepper Display */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Target Weight (kg)
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuickStep(-0.5)}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all text-xs"
                    title="-0.5 kg"
                  >
                    -0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStep(-0.1)}
                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    step="0.1"
                    value={inputWeight || ""}
                    onChange={(e) => setInputWeight(parseFloat(e.target.value) || 0)}
                    className="w-24 text-center font-mono font-black text-3xl bg-transparent text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuickStep(0.1)}
                    className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStep(0.5)}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all text-xs"
                    title="+0.5 kg"
                  >
                    +0.5
                  </button>
                </div>
              </div>

              {/* Date & Note inputs */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Date
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning fasting, post workout"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Weight Log"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[80vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-zinc-100">
                  Weight Log History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-zinc-800/60 my-2 flex-1">
              {stats.history.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No weight records found. Log your first check-in!
                </div>
              ) : (
                stats.history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-zinc-850/50 rounded-lg transition-colors"
                  >
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono font-bold text-sm text-zinc-100">
                          {item.weight.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase">
                          {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {item.date}
                        </span>
                        {item.note && (
                          <span className="text-[10px] text-zinc-500 italic truncate max-w-[150px]">
                            • {item.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setShowLogModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
