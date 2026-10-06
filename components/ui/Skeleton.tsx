import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-900/80 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function RoutineCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-12 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-3.5 w-14 rounded-md" />
            <Skeleton className="h-3.5 w-16 rounded-md" />
          </div>
        </div>
      </div>
      <Skeleton className="w-6 h-6 rounded-lg" />
    </div>
  );
}

export function HistoryCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/40">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
