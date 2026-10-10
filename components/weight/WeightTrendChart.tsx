"use client";

import React, { useState, useMemo } from "react";
import { LocalBodyWeightLog } from "@/types/workout";

interface WeightTrendChartProps {
  history: LocalBodyWeightLog[];
}

export function WeightTrendChart({ history }: WeightTrendChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<LocalBodyWeightLog | null>(null);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "ALL">("7D");

  // Filter and sort history chronologically
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Sort ascending by date
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (timeRange === "7D") {
      return sorted.slice(-7);
    }
    if (timeRange === "30D") {
      return sorted.slice(-30);
    }
    return sorted;
  }, [history, timeRange]);

  if (chartData.length === 0) {
    return (
      <div className="py-6 text-center text-zinc-500 text-xs font-mono">
        No weight history to plot yet
      </div>
    );
  }

  // Calculate min & max for Y-axis scaling
  const weights = chartData.map((d) => d.weight);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const range = rawMax - rawMin;
  const padding = range === 0 ? 1 : Math.max(0.5, range * 0.15);
  const minY = Math.floor((rawMin - padding) * 10) / 10;
  const maxY = Math.ceil((rawMax + padding) * 10) / 10;
  const ySpan = maxY - minY || 1;

  // Chart dimensions
  const width = 360;
  const height = 120;
  const chartPadLeft = 32;
  const chartPadRight = 16;
  const chartPadTop = 16;
  const chartPadBottom = 24;

  const innerW = width - chartPadLeft - chartPadRight;
  const innerH = height - chartPadTop - chartPadBottom;

  // Map data points to SVG coordinates
  const points = chartData.map((d, idx) => {
    const x =
      chartData.length === 1
        ? chartPadLeft + innerW / 2
        : chartPadLeft + (idx / (chartData.length - 1)) * innerW;
    const y = chartPadTop + innerH - ((d.weight - minY) / ySpan) * innerH;
    return { x, y, data: d };
  });

  // Construct SVG Path
  const linePath = points.reduce((path, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, "");

  // Construct Closed Area Path for gradient fill
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartPadTop + innerH} L ${points[0].x} ${
          chartPadTop + innerH
        } Z`
      : "";

  return (
    <div className="space-y-2">
      {/* Chart Controls & Active Point Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono">
          {selectedPoint ? (
            <span className="text-zinc-200 font-bold flex items-center gap-1">
              <span className="text-emerald-400">{selectedPoint.weight} kg</span>
              <span className="text-zinc-500 text-[10px]">({selectedPoint.date})</span>
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">
              Tap point to inspect • Range: {rawMin.toFixed(1)} - {rawMax.toFixed(1)} kg
            </span>
          )}
        </div>

        {/* Range Toggle Buttons */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-[10px]">
          {(["7D", "30D", "ALL"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setTimeRange(r);
                setSelectedPoint(null);
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                timeRange === r
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-28 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1={chartPadLeft}
            y1={chartPadTop}
            x2={width - chartPadRight}
            y2={chartPadTop}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={chartPadLeft}
            y1={chartPadTop + innerH / 2}
            x2={width - chartPadRight}
            y2={chartPadTop + innerH / 2}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={chartPadLeft}
            y1={chartPadTop + innerH}
            x2={width - chartPadRight}
            y2={chartPadTop + innerH}
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* Y-Axis Labels */}
          <text
            x={chartPadLeft - 6}
            y={chartPadTop + 3}
            textAnchor="end"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
          >
            {maxY.toFixed(1)}
          </text>
          <text
            x={chartPadLeft - 6}
            y={chartPadTop + innerH + 3}
            textAnchor="end"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
          >
            {minY.toFixed(1)}
          </text>

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#weightGrad)" />}

          {/* Trend Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((pt, i) => {
            const isSelected = selectedPoint?.id === pt.data.id;
            return (
              <g
                key={pt.data.id || i}
                className="cursor-pointer group"
                onClick={() => setSelectedPoint(pt.data)}
              >
                {/* Invisible larger hit target */}
                <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />

                {/* Outer halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5" : "3"}
                  fill="#10b981"
                  className="transition-all"
                />

                {/* Inner dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "2.5" : "1.5"}
                  fill="#09090b"
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis First & Last Date Labels */}
        <div className="flex items-center justify-between px-3 text-[9px] font-mono text-zinc-500 pt-0.5">
          <span>{chartData[0]?.date}</span>
          <span>{chartData[chartData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
