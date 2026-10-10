"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Dumbbell,
  Layers,
  Calendar,
  TrendingUp,
  Sparkles,
  Info,
  Mail,
  Activity,
  ChevronRight,
  Flame,
  Download,
} from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { PulseLogo } from "@/components/ui/Logo";
import { SyncStatusBadge } from "@/components/navigation/SyncStatusBadge";
import { AuthButton } from "@/components/auth/AuthButton";

export function DesktopSidebar() {
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

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const navLinks = [
    { label: "Home Dashboard", href: "/", icon: Dumbbell },
    { label: "Workout Routines", href: "/routines", icon: Layers },
    { label: "Workout History", href: "/history", icon: Calendar },
    { label: "Performance Analytics", href: "/analytics", icon: TrendingUp },
  ];

  const utilityLinks = [
    { label: "Services", href: "/services", icon: Sparkles },
    { label: "About", href: "/about", icon: Info },
    { label: "Contact", href: "/contact", icon: Mail },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 bg-zinc-950/95 border-r border-zinc-800/80 p-5 justify-between backdrop-blur-xl z-40">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 group">
          <PulseLogo size="md" />
          <div>
            <span className="text-base font-black tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors block leading-none">
              PULSE GYM
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold mt-1 block">
              Command Center
            </span>
          </div>
        </Link>

        {/* Live Active Workout Widget (If Active Session) */}
        {session && pathname !== "/workout/active" && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/30 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                Live Floor Session
              </span>
              <span className="font-mono text-xs font-black text-emerald-300">
                {formatTimer(workoutElapsedSec)}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-200 truncate">
              {session.title || "Gym Workout"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/workout/active")}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              <span>Resume Workout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 block mb-2 font-mono">
            Main Menu
          </span>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 font-black"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-emerald-400" : "text-zinc-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Utility / Company Links */}
        <div className="space-y-1 pt-4 border-t border-zinc-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 block mb-2 font-mono">
            Platform
          </span>
          {utilityLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-800/80 text-zinc-100 font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer: Sync & Athlete Account */}
      <div className="pt-4 border-t border-zinc-900/90 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-mono text-zinc-400 font-semibold">
            Cloud Engine
          </span>
          <SyncStatusBadge />
        </div>
        <div className="pt-1">
          <AuthButton />
        </div>
      </div>
    </aside>
  );
}
