"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";

interface ExerciseThumbnailProps {
  imageUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  onClick?: () => void;
}

export function ExerciseThumbnail({
  imageUrl,
  name,
  size = "md",
  className = "",
  onClick,
}: ExerciseThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "w-10 h-10 min-w-10 rounded-xl",
    md: "w-16 h-16 min-w-16 rounded-xl", // ~64px
    lg: "w-20 h-20 min-w-20 rounded-2xl",
    hero: "w-full h-44 rounded-2xl",
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`relative overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 ${
        sizeClasses[size]
      } ${
        isClickable ? "cursor-pointer active:scale-95 hover:border-emerald-500/50 transition-all" : ""
      } ${className}`}
      title={name}
    >
      {imageUrl && !hasError ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600">
          <Dumbbell className={size === "hero" ? "w-10 h-10 text-emerald-400/40" : "w-5 h-5 text-emerald-400/40"} />
          {size === "hero" && (
            <span className="text-[11px] font-mono text-zinc-500 mt-2 font-bold uppercase tracking-wider">
              Anatomical Diagram
            </span>
          )}
        </div>
      )}

      {/* Subtle glass reflection highlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
