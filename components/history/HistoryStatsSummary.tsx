import React from "react";
import { Activity } from "lucide-react";

interface HistoryStatsSummaryProps {
  stats: {
    count: number;
    totalVolume: number;
    hours: string;
    totalPRs: number;
  };
}

export function HistoryStatsSummary({ stats }: HistoryStatsSummaryProps) {
  const currentMonthLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <section className="w-full bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800/80 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          This Month&apos;s Training
        </span>
        <span className="text-[10px] font-mono font-bold text-zinc-500">
          {currentMonthLabel}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
          <span className="text-[9px] uppercase font-bold text-zinc-500 block">Sessions</span>
          <span className="text-sm font-black font-mono text-zinc-100">{stats.count}</span>
        </div>
        <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
          <span className="text-[9px] uppercase font-bold text-zinc-500 block">Volume</span>
          <span className="text-sm font-black font-mono text-emerald-400 truncate block">
            {stats.totalVolume > 1000
              ? `${Math.round(stats.totalVolume / 1000)}t`
              : `${stats.totalVolume}k`}
          </span>
        </div>
        <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
          <span className="text-[9px] uppercase font-bold text-zinc-500 block">Hours</span>
          <span className="text-sm font-black font-mono text-zinc-200">{stats.hours}h</span>
        </div>
        <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/60">
          <span className="text-[9px] uppercase font-bold text-zinc-500 block">PRs</span>
          <span className="text-sm font-black font-mono text-amber-400">{stats.totalPRs}</span>
        </div>
      </div>
    </section>
  );
}
