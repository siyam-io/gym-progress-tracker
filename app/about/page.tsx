"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Zap,
  Dumbbell,
  TrendingUp,
  Cpu,
  Compass,
} from "lucide-react";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { PulseLogo } from "@/components/ui/Logo";

export default function AboutPage() {
  const router = useRouter();

  const pillars = [
    {
      icon: TrendingUp,
      title: "Progressive Overload",
      description:
        "Hypertrophy and strength adaptations demand that muscle fibers experience gradually increasing tension over time. PULSE displays your exact ghost performance from prior sessions right in the logging row so you know the exact weight and rep count you must beat.",
    },
    {
      icon: Cpu,
      title: "Local-First Zero Latency",
      description:
        "Traditional cloud-only fitness apps freeze and spin when you enter reinforced concrete gyms or basement free-weight rooms. PULSE runs locally in your browser storage via IndexedDB (Dexie.js), guaranteeing instant feedback in sub-milliseconds.",
    },
    {
      icon: Dumbbell,
      title: "Pure Gym Floor Utility",
      description:
        "No bloated social feeds, no unsolicited fitness influencer videos, and no intrusive video ads between sets. When you are on the platform, your focus is entirely on your rest intervals, lifting cadence, and executing clean form.",
    },
    {
      icon: ShieldCheck,
      title: "Absolute Data Sovereignty",
      description:
        "Your sweat equity and performance logs belong entirely to you. PULSE offers complete local database export in open CSV and JSON formats anytime without paywalls or restrictive lock-ins.",
    },
  ];

  const milestones = [
    { metric: "870+", label: "Movements Cataloged" },
    { metric: "0 ms", label: "Local Write Latency" },
    { metric: "100%", label: "Offline Floor Availability" },
    { metric: "3-Day", label: "Optimized Split Protocol" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 selection:bg-emerald-500 selection:text-zinc-950">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>The PULSE Philosophy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-tight">
            Built for Lifters Who Value <span className="text-emerald-400">Data Over Distraction</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            PULSE GYM was conceived on the gym floor out of frustration with bloated, ad-cluttered
            fitness apps that crash in basement weight rooms. We built the logging companion we
            always wished existed.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/workout/active")}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Experience The Floor Tracker</span>
            </button>
          </div>
        </section>

        {/* Milestones Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {milestones.map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center space-y-1"
            >
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {item.metric}
              </div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {item.label}
              </div>
            </div>
          ))}
        </section>

        {/* The Origin Story */}
        <section className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5">
            <PulseLogo size="sm" />
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              The Genesis of PULSE
            </h2>
          </div>

          <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
            <p>
              Every serious lifter knows the routine: you step into a basement gym, pick up a heavy
              barbell, open an app to check what weight you hit last week on set 3, and stare at a
              loading spinner because cell reception just dropped. Or worse: you tap a button and an
              unskippable 30-second video ad starts blaring over your headphones right as your pre-workout kicks in.
            </p>
            <p>
              We realized that existing software treated lifters like advertising eyeball metrics
              rather than athletes trying to build their physical potential. We engineered PULSE from
              scratch around a single mandate: <span className="text-emerald-400 font-bold">extreme floor utility</span>.
            </p>
            <p>
              PULSE stores all exercise schemas, session history, and custom routines locally inside
              your device’s IndexedDB engine. It never waits for a cloud roundtrip. When you type in
              your weight and reps, it logs immediately. When internet returns, it syncs cleanly in
              the background without bothering you.
            </p>
          </div>
        </section>

        {/* 4 Core Pillars */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              Our Foundational Pillars
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Four principles governing every architectural and visual decision in PULSE GYM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <pillar.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-100">{pillar.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{pillar.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The 3-Day Programming Methodology */}
        <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Programming Blueprint
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              The Day 01, 02 & 03 Protocol
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Why our pre-built routines are structured with this specific anatomical hierarchy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 font-mono">DAY 01</span>
                <span className="text-[10px] font-semibold text-zinc-500">14 Movements</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-200">Push & Core Hypertrophy</h4>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Cardio warmup followed by compound chest pressing (Machine Incline, Flat Bench, Decline Press),
                cable tricep overload, dips, and isometric core stabilization (Crunches, Leg Raises, Plank).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 font-mono">DAY 02</span>
                <span className="text-[10px] font-semibold text-zinc-500">15 Movements</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-200">Pull & Posterior Chain</h4>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Cross-train warm up, vertical lat pulling (Pull-ups, Lat Pulldown, Reverse Grip), horizontal
                cable rows, hyperextensions for lower back integrity, focused bicep peaks, and core endurance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 font-mono">DAY 03</span>
                <span className="text-[10px] font-semibold text-zinc-500">11 Movements</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-200">Legs & Shoulder Power</h4>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Stationary cycle & cross-trainer priming, Barbell Squats, Walking Lunges, isolated Quad/Hamstring
                extensions, calf raises, Machine Shoulder Press, lateral raises, and heavy shrugs.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center space-y-4 pt-4">
          <h2 className="text-2xl font-black text-zinc-100">
            Have Questions or Need Customized Coaching?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Our team is always iterating based on athlete feedback and gym floor performance data.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/contact"
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Get In Touch With Team
            </Link>
            <Link
              href="/services"
              className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Explore Services & Plans
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
