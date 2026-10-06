"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";
import { db, processSyncQueue } from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const checkStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    try {
      const count = await db.outbox_sync_queue.count();
      setPendingCount(count);
    } catch {
      // Ignore Dexie read errors if database is initializing
    }
  }, []);

  useEffect(() => {
    void checkStatus();

    const handleOnline = () => {
      setIsOnline(true);
      void checkStatus();
      void handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info("Offline mode active. All workouts are saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkStatus, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkStatus]);

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast.info("Offline mode: changes will sync once internet returns.");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await processSyncQueue();
      await checkStatus();
      if (res.processedCount > 0) {
        toast.success(`Synced ${res.processedCount} update${res.processedCount > 1 ? "s" : ""} to cloud!`);
      } else {
        toast.info("Everything is up to date.");
      }
    } catch {
      toast.error("Sync attempt failed. Will retry automatically.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <button
        type="button"
        onClick={handleSync}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Offline mode - changes saved locally"
      >
        <CloudOff className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden sm:inline">Offline</span>
      </button>
    );
  }

  if (isSyncing || pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={handleSync}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-400 hover:bg-amber-500/20 transition-colors"
        title="Syncing pending mutations to cloud"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
        <span>{pendingCount > 0 ? `${pendingCount} pending` : "Syncing"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-mono text-emerald-400 hover:border-emerald-500/40 transition-colors group"
      title="Cloud synced & up to date (tap to force sync)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      <Cloud className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
    </button>
  );
}
