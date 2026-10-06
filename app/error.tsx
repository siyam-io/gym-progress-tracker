"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Pulse App Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl shadow-red-500/10">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-black uppercase tracking-tight text-zinc-100 mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        {error.message || "An unexpected error occurred while processing your workout data."}
      </p>

      {error.digest && (
        <span className="text-[11px] font-mono text-zinc-600 mb-6 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">
          Ref: {error.digest}
        </span>
      )}

      <div className="flex items-center gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => reset()}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors text-center"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
