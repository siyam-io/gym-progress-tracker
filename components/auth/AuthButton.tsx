"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, X, ShieldCheck, ChevronDown, User, RefreshCw } from "lucide-react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { PulseLogo } from "@/components/ui/Logo";
import { fullBiDirectionalSync } from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

export function AuthButton() {
  const { data: session, status } = useSession();
  const { setCurrentUserId } = useWorkoutStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      void fullBiDirectionalSync(session.user.id);
    } else {
      setCurrentUserId(null);
    }
  }, [session, setCurrentUserId]);

  // Close popover on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-200 font-bold text-xs active:scale-95 transition-all shadow-sm group shrink-0"
        title="Sign in with Google account"
      >
        {/* Google 'G' Icon */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="hidden sm:inline">Sign in</span>
        <span className="sm:hidden">Login</span>
      </button>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      {/* Logged in avatar trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 p-1 pl-1.5 sm:pl-2 rounded-xl border transition-all shrink-0 active:scale-95 ${
          isOpen
            ? "bg-zinc-800 border-zinc-700 shadow-md ring-2 ring-emerald-500/20"
            : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
        }`}
        title="View Profile & Settings"
      >
        <span className="text-xs font-bold text-zinc-300 max-w-[70px] truncate hidden md:inline">
          {user.name?.split(" ")[0]}
        </span>
        {user.image ? (
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-700 relative shrink-0">
            <Image
              src={user.image}
              alt={user.name || "User"}
              width={28}
              height={28}
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 hidden sm:block ${
            isOpen ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {/* Profile Anchored Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-84 max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <PulseLogo size="sm" />
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Athlete Profile
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User Info Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            {user.image ? (
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                <Image
                  src={user.image}
                  alt={user.name || "User"}
                  width={44}
                  height={44}
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm text-zinc-100 truncate">
                {user.name || "Logged In Athlete"}
              </h3>
              <span className="text-xs text-zinc-400 truncate block font-mono">
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Cloud Sync Linked
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed px-0.5">
            Workouts, custom routines, and PR records sync to your account and back up in local Dexie IndexedDB.
          </p>

          {/* Actions */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              disabled={isManualSyncing}
              onClick={async () => {
                setIsManualSyncing(true);
                try {
                  const res = await fullBiDirectionalSync(session?.user?.id);
                  if (res.success) {
                    toast.success(`Cloud synced! ${res.pulledSessions} sessions & ${res.pulledRoutines} routines verified.`);
                  } else {
                    toast.error("Sync failed or offline.");
                  }
                } catch {
                  toast.error("Failed to sync cloud data.");
                } finally {
                  setIsManualSyncing(false);
                }
              }}
              className="w-full py-2.5 min-h-[40px] rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? "animate-spin" : ""}`} />
              <span>{isManualSyncing ? "Syncing with Cloud..." : "Sync Cloud Data Now"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full py-2.5 min-h-[40px] rounded-xl bg-zinc-950 border border-red-500/30 hover:bg-red-950/40 text-red-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
