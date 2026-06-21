"use client";
// app/page.tsx
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SectionBuilder } from "@/components/SectionBuilder";
import {
  DEFAULT_SECTIONS,
  validateSections,
} from "@/lib/sectionDefaults";
import type { SectionConfig } from "@/types";

const EXAMPLES = [
  "Build a creator marketplace platform connecting brands with micro-influencers...",
  "Design an AI-powered legal document review tool for boutique law firms...",
  "Create a B2B SaaS platform for construction project management...",
  "Launch a peer-to-peer skills exchange marketplace for college students...",
  "Build a mental health support platform for remote workers...",
];

const SECTION_CONFIG_KEY = "section_config";

export default function Home() {
  const [problem, setProblem] = useState("");
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("problem");
    if (saved) setProblem(saved);

    const savedSections = localStorage.getItem(SECTION_CONFIG_KEY);
    if (savedSections) {
      try {
        const parsed = JSON.parse(savedSections) as SectionConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSections(parsed);
        }
      } catch {
        // ignore bad cache
      }
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;

    const validationError = validateSections(sections);
    if (validationError) {
      setSectionError(validationError);
      return;
    }

    setSectionError(null);
    localStorage.setItem("problem", problem.trim());
    localStorage.setItem(SECTION_CONFIG_KEY, JSON.stringify(sections));
    router.push("/report");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50 overflow-hidden font-sans">

      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[32rem] h-[32rem] bg-sky-200/40 rounded-full blur-[100px] animate-orb-drift mix-blend-multiply" />
        <div className="absolute bottom-1/4 -right-32 w-[32rem] h-[32rem] bg-orange-200/40 rounded-full blur-[100px] animate-orb-drift mix-blend-multiply" style={{ animationDelay: '-6s' }} />
      </div>

      <div className="w-full max-w-4xl px-6 py-12 relative z-10 flex flex-col items-center">

        {/* Hero Copy */}
        <div className="text-center space-y-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            AI Planning System
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto">
            Turn any problem into <span className="shimmer-text font-bold">an execution plan</span>
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Multi-agent AI runs parallel analysis across specialist agents, then synthesizes a board-ready strategic plan tailored to your section outline.
          </p>
        </div>

        {/* Main Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-light rounded-[24px] p-2 transition-all duration-300 focus-within:ring-4 focus-within:ring-orange-500/20 focus-within:border-orange-500/40 relative group">
            <div className="relative">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Build a creator marketplace platform connecting brands with micro-influencers..."
                className="w-full h-36 bg-transparent text-slate-800 placeholder-slate-400 p-6 rounded-[20px] resize-none focus:outline-none text-lg selection:bg-orange-200 selection:text-orange-900"
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                ~30–60 seconds · parallel agents
              </div>
              <button
                type="submit"
                disabled={!problem.trim()}
                className="group flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-orange-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 glow-orange"
              >
                Generate Execution Plan
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                  <path d="M3.33331 8H12.6666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 3.33325L12.6667 7.99992L8 12.6666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <SectionBuilder
            sections={sections}
            onChange={(next) => {
              setSections(next);
              if (sectionError) setSectionError(null);
            }}
            error={sectionError}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1 font-medium">
              <kbd className="font-sans">Ctrl</kbd>+<kbd className="font-sans">Enter</kbd> to submit
            </span>
            <span>· exports to DOCX & PDF</span>
          </div>
        </form>

        {/* Examples */}
        <div className="mt-12 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Try an example</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProblem(ex)}
                className="text-xs bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm max-w-[280px] truncate"
                title={ex}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
