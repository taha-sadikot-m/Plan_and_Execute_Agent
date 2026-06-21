"use client";

import type { SectionConfig } from "@/types";
import {
  createSection,
  MAX_SECTIONS,
  MIN_SECTIONS,
} from "@/lib/sectionDefaults";

interface Props {
  sections: SectionConfig[];
  onChange: (sections: SectionConfig[]) => void;
  error?: string | null;
}

export function SectionBuilder({ sections, onChange, error }: Props) {
  const updateSection = (index: number, field: "title" | "description", value: string) => {
    const next = sections.map((sec, i) =>
      i === index ? { ...sec, [field]: value } : sec
    );
    onChange(next);
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    onChange([...sections, createSection("New Section", "Describe what this section should cover.")]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= MIN_SECTIONS) return;
    onChange(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="w-full max-w-2xl mt-8 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Report Sections
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize sections — agents adapt to your outline ({MIN_SECTIONS}–{MAX_SECTIONS} sections)
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          disabled={sections.length >= MAX_SECTIONS}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add section
        </button>
      </div>

      <div className="space-y-3">
        {sections.map((sec, index) => (
          <div
            key={sec.id}
            className="glass-light rounded-2xl border border-slate-200/80 p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 11V3M3 7L7 3L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3V11M3 7L7 11L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => updateSection(index, "title", e.target.value)}
                    placeholder="Section title"
                    className="flex-1 bg-transparent text-slate-800 font-semibold text-sm focus:outline-none placeholder-slate-400 border-b border-transparent focus:border-orange-300 pb-0.5 transition-colors"
                  />
                </div>
                <textarea
                  value={sec.description}
                  onChange={(e) => updateSection(index, "description", e.target.value)}
                  placeholder="What should this section cover? Be specific — agents use this to structure content."
                  rows={2}
                  className="w-full bg-slate-50/80 text-slate-600 text-sm placeholder-slate-400 p-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => removeSection(index)}
                disabled={sections.length <= MIN_SECTIONS}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Remove section"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
