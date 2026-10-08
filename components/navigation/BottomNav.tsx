"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, Calendar, TrendingUp, ChevronRight, Activity, Layers } from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, workoutElapsedSec, incrementWorkoutElapsed } = useWorkoutStore();

  // Keep live elapsed timer ticking in background when navigating other pages during active session
  useEffect(() => {
    if (!session || pathname === "/workout/active") return;
    const interval = setInterval(() => {
      incrementWorkoutElapsed();
    }, 1000);
    return () => clearInterval(interval);
  }, [session, pathname, incrementWorkoutElapsed]);

  // Hide bottom nav on live workout floor so RestTimerBar and gym floor inputs have full space
  if (pathname === "/workout/active") {
    return null;
  }

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const navItems = [
    { label: "Home", href: "/", icon: Dumbbell },
    { label: "Routines", href: "/routines", icon: Layers },
    { label: "History", href: "/history", icon: Calendar },
    { label: "Analytics", href: "/analytics", icon: TrendingUp },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full pointer-events-none">
      {/* Mini Persistent In-Progress Workout Floating Banner */}
      {session && (
        <div className="max-w-md mx-auto px-3 pb-2 pointer-events-auto">
          <Link
            href="/workout/active"
            onClick={(e) => {
              e.preventDefault();
              router.push("/workout/active");
            }}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-900 border border-emerald-500/40 shadow-xl shadow-emerald-950/40 text-zinc-100 hover:border-emerald-400 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Workout in Progress
                </span>
                <span className="text-xs font-semibold text-zinc-200 truncate max-w-[170px]">
                  {session.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-emerald-300">
                {formatTimer(workoutElapsedSec)}
              </span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Main 4-Tab Bottom Navigation Bar - Edge to edge bar with centered buttons */}
      <nav className="pointer-events-auto bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 pb-safe shadow-2xl w-full">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-h-[44px] transition-all ${
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300 active:text-zinc-200"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                    isActive ? "bg-emerald-500/10" : "bg-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                </div>
                <span
                  className={`text-[10px] tracking-tight font-semibold mt-0.5 ${
                    isActive ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
