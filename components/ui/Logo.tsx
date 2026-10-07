"use client";

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function PulseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="pulseEmeraldGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pulseGlowGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer subtle glow */}
      <circle cx="24" cy="24" r="22" fill="url(#pulseGlowGrad)" />

      {/* Dumbbell Left Plate Outer */}
      <rect x="7" y="15" width="4" height="18" rx="2" fill="url(#pulseEmeraldGrad)" />
      {/* Dumbbell Left Plate Inner */}
      <rect x="13" y="11" width="3.5" height="26" rx="1.75" fill="url(#pulseEmeraldGrad)" />

      {/* Dumbbell Right Plate Inner */}
      <rect x="31.5" y="11" width="3.5" height="26" rx="1.75" fill="url(#pulseEmeraldGrad)" />
      {/* Dumbbell Right Plate Outer */}
      <rect x="37" y="15" width="4" height="18" rx="2" fill="url(#pulseEmeraldGrad)" />

      {/* Central Bar with Pulse / Heartbeat Wave */}
      <path
        d="M16.5 24H20.5L22.5 17L25.5 31L27.5 24H31.5"
        stroke="url(#pulseEmeraldGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PulseLogo({
  size = "md",
  showText = false,
  className = "",
}: LogoProps) {
  const sizeMap = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-12 h-12 rounded-2xl",
    xl: "w-16 h-16 rounded-3xl",
  };

  const iconSizeMap = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
    xl: "w-9 h-9",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeMap[size]} bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-[1.5px] shadow-lg shadow-emerald-500/20 shrink-0`}
      >
        <div className="w-full h-full bg-zinc-950 rounded-[inherit] flex items-center justify-center p-1">
          <PulseIcon className={iconSizeMap[size]} />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-wider text-zinc-100 uppercase">
            PULSE <span className="text-emerald-400 font-extrabold">GYM</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Floor Tracker</span>
        </div>
      )}
    </div>
  );
}
