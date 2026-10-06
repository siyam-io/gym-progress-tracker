import React from "react";
import Link from "next/link";
import { Compass, Home, Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-6 shadow-xl shadow-emerald-500/5">
        <Compass className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-1">
        Error 404
      </span>
      <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-100 mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        The workout floor or route you are looking for does not exist or has been moved.
      </p>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/exercises"
          className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
        >
          <Dumbbell className="w-4 h-4" />
          <span>Exercises</span>
        </Link>
      </div>
    </div>
  );
}
