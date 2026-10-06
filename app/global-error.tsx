"use client";

import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-100 mb-2">
          Critical Application Error
        </h1>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          {error.message || "A critical system error occurred. Please refresh the page to reload the application."}
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload PULSE</span>
        </button>
      </body>
    </html>
  );
}
