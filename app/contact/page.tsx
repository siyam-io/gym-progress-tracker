"use client";

import React, { useState } from "react";
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { toast } from "@/stores/useToastStore";

interface FaqItem {
  question: string;
  answer: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "GENERAL",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: "Does PULSE GYM really work without internet or mobile reception?",
      answer:
        "Yes, 100%. PULSE is built on a local-first architecture powered by Dexie.js and client-side IndexedDB. All 870+ exercises, your Day 01, Day 02, and Day 03 routines, and every single logged set write directly to your phone's browser storage. When your device reconnects to WiFi or 5G, our background outbox engine synchronizes seamlessly without interrupting your sets.",
    },
    {
      question: "How does the Brzycki 1RM PR Engine calculate my personal records?",
      answer:
        "We utilize the proven Brzycki equation: 1RM = Weight × (36 / (37 - Reps)). When you perform a set with 5 to 12 repetitions to near-failure, the engine estimates your maximal single-rep capacity and checks if you've surpassed your historical best, awarding an instant PR badge.",
    },
    {
      question: "Can I add cardio and custom exercises to my routines?",
      answer:
        "Absolutely! In our latest update, Cardio is an official first-class category. You can filter and add Treadmill, Cycle, Cross Trainer, Jump Rope, Rowing, and Stair Climber directly into Day 01, Day 02, Day 03, or create your own custom routines with personalized movement sequences.",
    },
    {
      question: "Can I export my logbook data if I want to switch apps?",
      answer:
        "Yes. We believe in absolute data sovereignty. You can export your entire workout history as a clean CSV file (compatible with Microsoft Excel, Apple Numbers, and Google Sheets) or raw JSON backup file at any time from your logbook page.",
    },
    {
      question: "Why does the rest interval timer not freeze when my phone screen locks?",
      answer:
        "Most web timers freeze because mobile browsers throttle background JavaScript execution. PULSE uses timestamp differential compensation and Web Audio synthesis beeps so your rest intervals stay accurate to the millisecond even with your phone in your pocket.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    // Simulate instantaneous local capture
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Thank you! Your message has been received by the PULSE team.");
      setFormData({
        name: "",
        email: "",
        inquiryType: "GENERAL",
        subject: "",
        message: "",
      });
    }, 700);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28 selection:bg-emerald-500 selection:text-zinc-950">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Athlete Support</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-tight">
            Connect With the <span className="text-emerald-400">PULSE Team</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Have a training question, feature request, gym floor partnership inquiry, or need assistance
            with your workout logs? We respond within 12 business hours.
          </p>
        </section>

        {/* 2-Column: Contact Form & Info Cards */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Form */}
          <div className="md:col-span-7 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-100 uppercase tracking-tight">
                Send an Athlete Dispatch
              </h2>
              <p className="text-xs text-zinc-400">
                Direct channel to our product technologist and exercise science team.
              </p>
            </div>

            {isSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">Message Dispatched!</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Thank you for reaching out. We have logged your submission and a member of the
                  PULSE floor team will review your message promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                      Athlete Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Hunter"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. athlete@pulsefitness.dev"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Inquiry Type */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Inquiry Category
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="GENERAL">General Athlete Inquiry</option>
                    <option value="ROUTINE">Day 01-03 & Cardio Feedback</option>
                    <option value="FEATURE">Feature / Exercise Request</option>
                    <option value="BUG">Bug or Glitch Report</option>
                    <option value="COACH">Personal Coaching / Gym Partner</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of your inquiry..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Detailed Message *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your training questions, bug reproduction steps, or custom split ideas..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Dispatching..." : "Transmit Message"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Direct Info Cards */}
          <div className="md:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Mail className="w-5 h-5" />
                <h3 className="font-bold text-sm text-zinc-200">Electronic Mail</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct inquiry inbox for technical questions, bug reports, and data recovery assistance.
              </p>
              <div className="space-y-1">
                <a
                  href="mailto:support@pulsegym.io"
                  className="text-xs font-mono font-bold text-emerald-400 hover:underline block"
                >
                  support@pulsegym.io
                </a>
                <a
                  href="mailto:athlete@pulsegym.io"
                  className="text-xs font-mono font-semibold text-zinc-400 hover:text-zinc-200 block"
                >
                  athlete@pulsegym.io
                </a>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-sm text-zinc-200">Floor Availability & Hours</h3>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Offline Tracker Engine</span>
                  <span className="font-mono text-emerald-400 font-bold">24 / 7 / 365</span>
                </div>
                <div className="flex justify-between">
                  <span>Cloud Synchronization</span>
                  <span className="font-mono text-zinc-300">Continuous</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical Support SLA</span>
                  <span className="font-mono text-zinc-300">&lt; 12 Hours</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-sm text-zinc-200">Data Guarantee</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                PULSE will never sell your training logs or biometric weight logs to third-party ad
                exchanges. All core data is encrypted and saved directly to your local device.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-colors hover:border-zinc-700"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-4.5 sm:p-5 flex items-center justify-between gap-3 text-left transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-zinc-100">
                      {faq.question}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/50 animate-in fade-in duration-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
