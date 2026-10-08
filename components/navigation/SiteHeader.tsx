"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Dumbbell,
  Sparkles,
  Info,
  Mail,
  ChevronRight,
  Zap,
} from "lucide-react";
import { PulseLogo } from "@/components/ui/Logo";

interface SiteHeaderProps {
  rightSlot?: React.ReactNode;
}

export function SiteHeader({ rightSlot }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Dashboard", href: "/", icon: Dumbbell },
    { label: "Services", href: "/services", icon: Sparkles },
    { label: "About", href: "/about", icon: Info },
    { label: "Contact", href: "/contact", icon: Mail },
  ];

  return (
    <>
      <header className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-zinc-900/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <PulseLogo size="sm" />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-zinc-100 uppercase group-hover:text-emerald-400 transition-colors">
              PULSE <span className="text-emerald-400">GYM</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium -mt-0.5 hidden xs:block">
              Progressive Floor Tracker
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section Slot & Mobile Toggle */}
        <div className="flex items-center gap-2">
          {rightSlot}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md md:hidden animate-in fade-in duration-150">
          <div className="bg-zinc-900 border-b border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <PulseLogo size="sm" />
                <span className="font-black text-sm text-zinc-100 uppercase">
                  PULSE <span className="text-emerald-400">GYM</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/20"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/workout/active");
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch Active Floor Tracker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
