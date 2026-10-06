"use client";

import React from "react";
import { useToastStore, ToastItem } from "@/stores/useToastStore";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";
  const isWarning = toast.type === "warning";

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
        isSuccess
          ? "bg-zinc-950/90 border-emerald-500/40 text-zinc-100 shadow-emerald-500/10"
          : isError
          ? "bg-zinc-950/90 border-red-500/40 text-zinc-100 shadow-red-500/10"
          : isWarning
          ? "bg-zinc-950/90 border-amber-500/40 text-zinc-100 shadow-amber-500/10"
          : "bg-zinc-950/90 border-zinc-700/60 text-zinc-100 shadow-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
            isSuccess
              ? "bg-emerald-500/20 text-emerald-400"
              : isError
              ? "bg-red-500/20 text-red-400"
              : isWarning
              ? "bg-amber-500/20 text-amber-400"
              : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {isSuccess && <CheckCircle2 className="w-4 h-4" />}
          {isError && <AlertCircle className="w-4 h-4" />}
          {isWarning && <AlertTriangle className="w-4 h-4" />}
          {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
        </div>
        <p className="text-xs font-semibold text-zinc-200 truncate leading-snug">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
