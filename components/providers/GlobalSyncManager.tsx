"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { fullBiDirectionalSync, deduplicateDatabaseRecords } from "@/lib/db/dexie";

export function GlobalSyncManager() {
  const { data: session } = useSession();
  const { setCurrentUserId } = useWorkoutStore();
  const lastSyncTimeRef = useRef<number>(0);

  const runSync = async (userId?: string) => {
    const now = Date.now();
    // Throttle requests to at most once every 5 seconds
    if (now - lastSyncTimeRef.current < 5000) return;
    lastSyncTimeRef.current = now;

    try {
      const res = await fullBiDirectionalSync(userId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("pulse-data-synced", { detail: res }));
      }
    } catch (err) {
      console.warn("[GlobalSyncManager] Background sync warning:", err);
    }
  };

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      setCurrentUserId(userId);
      void runSync(userId);
    } else {
      setCurrentUserId(null);
      void deduplicateDatabaseRecords();
    }
  }, [session?.user?.id, setCurrentUserId]);

  // Sync on tab visibility change (crucial when switching between PC and mobile phone)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session?.user?.id) {
        void runSync(session.user.id);
      }
    };

    const handleFocus = () => {
      if (session?.user?.id) {
        void runSync(session.user.id);
      }
    };

    const handleOnline = () => {
      if (session?.user?.id) {
        void runSync(session.user.id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    // Periodic background sync every 60 seconds if user is logged in
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && session?.user?.id) {
        void runSync(session.user.id);
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  return null;
}
