"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { db, fullBiDirectionalSync } from "@/lib/db/dexie";
import { toast } from "@/stores/useToastStore";

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
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

  const handleSync = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fullBiDirectionalSync();
      await checkStatus();
      if (res.success) {
        toast.success("Data synced with cloud!");
      }
    } catch {
      // Background retry silently
    } finally {
      setIsSyncing(false);
    }
  }, [checkStatus]);

  useEffect(() => {
    let cancelled = false;
    db.outbox_sync_queue
      .count()
      .then((count) => {
        if (!cancelled) setPendingCount(count);
      })
      .catch(() => {});

    const handleOnline = () => {
      setIsOnline(true);
      void checkStatus();
      void handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkStatus, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkStatus, handleSync]);

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
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shrink-0"
        title={`${pendingCount} offline updates pending sync. Tap to sync now.`}
      >
        <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="font-bold">{pendingCount > 0 ? (pendingCount > 99 ? "99+" : pendingCount) : "Sync"}</span>
        <span className="hidden sm:inline text-[10px] opacity-80">pending</span>
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
