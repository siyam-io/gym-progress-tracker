"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  Dumbbell,
  Clock,
  Layers,
  Database,
  LineChart,
  Scale,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Flame,
  Award,
  ChevronRight,
  HeartPulse,
} from "lucide-react";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { PulseLogo } from "@/components/ui/Logo";

export default function ServicesPage() {
  const router = useRouter();

  const services = [
    {
      icon: Database,
      badge: "Architecture",
      title: "Offline-First Gym Floor Engine",
      description:
        "Engineered with local IndexedDB (Dexie.js) to guarantee 0ms latency in basement gym floors or zero-reception facilities. Every rep, set, and PR is saved instantly to your device with background outbox synchronization.",
      features: [
        "Zero-latency set logging without loading spinners",
        "Background cloud syncing outbox pattern",
        "Full Progressive Web App (PWA) offline install",
        "Encrypted local storage with JSON/CSV export",
      ],
      tag: "100% Offline Ready",
    },
    {
      icon: LineChart,
      badge: "Hypertrophy Science",
      title: "Progressive Overload & 1RM PR Engine",
      description:
        "Take the guesswork out of strength progression. Real-time Brzycki 1RM formula recalculates your maximum potential on every set and detects new Personal Records dynamically as you lift.",
      features: [
        "Brzycki single-rep maximum (1RM) estimation",
        "Historical ghost placeholders show past session weights",
        "Instant PR notifications & medal badges",
        "Total session tonnage (Volume = Sets × Reps × Weight)",
      ],
      tag: "Automated PR Detection",
    },
    {
      icon: Layers,
      badge: "Programming",
      title: "Structured Split & Routine Engine",
      description:
        "Battle-tested routine splits covering hypertrophy, push/pull/legs mechanics, core stability, and cardio endurance. Fully customizable with our real-time movement builder.",
      features: [
        "Day 01 (Push & Core - 14 movements)",
        "Day 02 (Pull & Core - 15 movements)",
        "Day 03 (Legs & Shoulders - 11 movements)",
        "Full Cardio suite integration (Treadmill, Cycle, Cross train)",
      ],
      tag: "Pre-Built & Custom",
    },
    {
      icon: Clock,
      badge: "Performance",
      title: "Drift-Free Precision Rest Timer",
      description:
        "Mobile browsers throttle background JavaScript timers when screens lock. PULSE utilizes high-precision drift correction and audio cues to keep your inter-set recovery periods strict.",
      features: [
        "Background persistent audio countdown chimes",
        "Adaptive quick presets: 45s, 60s, 90s, 120s, 180s",
        "Lock-screen persistent status notifications",
        "Auto-advancing set counter upon timer expiry",
      ],
      tag: "Sub-Second Accuracy",
    },
    {
      icon: Dumbbell,
      badge: "Library",
      title: "870+ Exercise Catalog & Movement Anatomics",
      description:
        "Complete visual reference database with equipment categories (Barbell, Dumbbell, Cable, Machine, Bodyweight, and Cardio) and primary/secondary target muscle group tagging.",
      features: [
        "Step-by-step kinetic execution cues",
        "Plate loading calculator (Olympic 20kg bar + 45/35/25/10/5/2.5lb plates)",
        "Custom exercise creator with equipment tags",
        "Instant search across names and anatomical targets",
      ],
      tag: "870+ Movements",
    },
    {
      icon: Scale,
      badge: "Biometrics",
      title: "Body Recomposition & Weight Tracking",
      description:
        "Track morning bodyweight metrics alongside your lifting volume. Seamlessly detect caloric surplus or deficit trends to optimize muscle hypertrophy vs fat loss velocity.",
      features: [
        "Daily weigh-in logger with date stamps and notes",
        "7-day moving averages to smooth water fluctuations",
        "Direct kg/lbs unit toggling",
        "Volume-to-weight correlation insights",
      ],
      tag: "Biometric Logging",
    },
  ];

  const plans = [
    {
      name: "Athlete Free",
      price: "$0",
      period: "forever",
      description: "Everything you need to log workouts on the gym floor offline.",
      highlight: false,
      features: [
        "Unlimited workout sessions & set logs",
        "Full Day 01, Day 02, Day 03 pre-built routines",
        "870+ exercise library with cardio suite",
        "100% offline-first Dexie.js local database",
        "Ghost placeholders & Brzycki 1RM PR calculations",
        "Millisecond audio rest interval timer",
        "CSV & JSON logbook data export",
      ],
      cta: "Start Free Training",
      action: () => router.push("/"),
    },
    {
      name: "Pro Floor Pass",
      price: "$4.99",
      period: "per month",
      description: "Cloud sync & multi-device mobility for serious lifters.",
      highlight: true,
      features: [
        "Everything in Athlete Free tier",
        "Continuous Google Cloud multi-device synchronization",
        "Unlimited custom routine creations & sharing",
        "Historical volume heatmaps & muscle balance charts",
        "Priority feature voting & new movement requests",
        "Cloud automated database backup & restore",
      ],
      cta: "Explore Pro Features",
      action: () => router.push("/"),
    },
    {
      name: "Gym & Coach Partner",
      price: "$19.99",
      period: "per month",
      description: "For personal trainers and boutique gym communities.",
      highlight: false,
      features: [
        "Everything in Pro Floor Pass",
        "Preset routine distribution to clients",
        "Client compliance & training volume audits",
        "Branded gym floor routine cards",
        "Dedicated VIP support channel",
      ],
      cta: "Contact Partnership",
      action: () => router.push("/contact"),
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 selection:bg-emerald-500 selection:text-zinc-950">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>PULSE Training Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-tight">
            Scientific Services Built for the <span className="text-emerald-400">Gym Floor</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            PULSE combines sports science, progressive overload mechanics, and zero-latency
            offline engineering to deliver an uncompromising training logging suite.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/workout/active")}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Launch Gym Floor Tracker</span>
            </button>
            <Link
              href="/about"
              className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <span>Our Philosophy</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        </section>

        {/* 6 Core Services Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              Comprehensive Service Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Six synchronized modules designed to replace bulky gym logbooks and slow mobile apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <service.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-emerald-400">
                    {service.tag}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    {service.badge}
                  </span>
                  <h3 className="text-base font-extrabold text-zinc-100 group-hover:text-emerald-300 transition-colors mt-0.5">
                    {service.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  {service.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Membership / Pricing Tiers */}
        <section className="space-y-6 pt-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              Transparent Access Tiers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              The core logging floor engine is 100% free and offline forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-5 flex flex-col justify-between space-y-5 transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-900 border-2 border-emerald-500/60 shadow-xl shadow-emerald-950/30"
                    : "bg-zinc-900/60 border border-zinc-800/80"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-zinc-100">{plan.price}</span>
                    <span className="text-xs text-zinc-500 font-medium">/{plan.period}</span>
                  </div>

                  <p className="text-xs text-zinc-400">{plan.description}</p>

                  <div className="space-y-2 pt-3 border-t border-zinc-800">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={plan.action}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/25"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Call to action bottom banner */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-900 border border-emerald-500/40 text-center space-y-4 shadow-2xl">
          <PulseLogo size="lg" className="mx-auto justify-center" />
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-100">
            Ready to Take Your Training Seriously?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Experience zero-lag gym floor logging with Day 01, Day 02, and Day 03 preloaded.
          </p>
          <button
            type="button"
            onClick={() => router.push("/workout/active")}
            className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-emerald-500/30"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Start Empty Workout Session</span>
          </button>
        </section>
      </main>
    </div>
  );
}
