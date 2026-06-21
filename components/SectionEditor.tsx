"use client";
// components/SectionEditor.tsx
import { useState } from "react";
import type { SectionData, SectionId, EditVersionEntry } from "@/types";

interface Props {
  sectionId: SectionId;
  currentContent: SectionData;
  problem: string;
  otherSections: Record<string, SectionData>;
  history: EditVersionEntry[];
  onSave: (updated: SectionData, instruction: string) => void;
  onClose: () => void;
}

const QUICK_EDITS = [
  "Make this more detailed and specific",
  "Rewrite in a more professional tone",
  "Shorten this section by 40%",
  "Make this more actionable with concrete steps",
  "Simplify the language for a non-technical audience",
  "Add more data points and statistics",
];

export function SectionEditor({
  sectionId,
  currentContent,
  problem,
  otherSections,
  history,
  onSave,
  onClose,
}: Props) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleEdit = async (customInstruction?: string) => {
    const finalInstruction = customInstruction ?? instruction;
    if (!finalInstruction.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agent/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          currentContent,
          editInstruction: finalInstruction,
          problem,
          otherSections,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Edit failed");
      }

      const { updatedSection } = await res.json();
      onSave(updatedSection, finalInstruction);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit with AI</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Editing: <span className="text-slate-700">{currentContent.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors p-2"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick edit chips */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Quick edits
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_EDITS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleEdit(q)}
                  disabled={loading}
                  className="text-xs px-3.5 py-2 rounded-full border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 transition-all disabled:opacity-50 font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Custom instruction
            </p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Focus more on technical implementation details..."
              rows={3}
              className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none transition-all font-medium"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm font-medium text-red-700 shadow-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => handleEdit()}
            disabled={loading || !instruction.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold text-sm hover:from-orange-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Rewriting with Gemini...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.5 8L6 11.5L13.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Apply edit
              </>
            )}
          </button>

          {/* Version history */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform ${showHistory ? "rotate-180" : ""}`}
                >
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Version history ({history.length} edit{history.length !== 1 ? "s" : ""})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2">
                  {[...history].reverse().map((entry) => (
                    <div
                      key={entry.version}
                      className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">v{entry.version}</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{entry.editInstruction}</p>
                      </div>
                      <button
                        onClick={() => {
                          onSave(entry.content, `Restored v${entry.version}`);
                          onClose();
                        }}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
