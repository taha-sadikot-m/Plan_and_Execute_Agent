"use client";
// app/report/page.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AgentPipeline } from "@/components/AgentPipeline";
import { ReportSections } from "@/components/ReportSections";
import { SectionEditor } from "@/components/SectionEditor";
import { ExportButtons } from "@/components/ExportButtons";
import { sectionsConfigEqual } from "@/lib/sectionDefaults";
import type {
  ReportJSON,
  AgentLogEntry,
  PipelineStatus,
  SectionId,
  SectionData,
  SectionVersionHistory,
  EditVersionEntry,
  SectionConfig,
} from "@/types";

const SECTION_CONFIG_KEY = "section_config";

function isLegacyReport(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "problemBreakdown" in parsed
  );
}

export default function ReportPage() {
  const router = useRouter();

  const [problem, setProblem] = useState<string>("");
  const [sectionConfig, setSectionConfig] = useState<SectionConfig[]>([]);
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [agentLog, setAgentLog] = useState<AgentLogEntry[]>([]);
  const [report, setReport] = useState<ReportJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<SectionId | null>(null);
  const [versionHistory, setVersionHistory] = useState<SectionVersionHistory>({});

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (report) {
      localStorage.setItem("last_report", JSON.stringify(report));
    }
  }, [report]);

  useEffect(() => {
    const savedProblem = localStorage.getItem("problem");
    const savedSections = localStorage.getItem(SECTION_CONFIG_KEY);

    if (!savedProblem || !savedSections) {
      router.push("/");
      return;
    }

    let parsedSections: SectionConfig[];
    try {
      parsedSections = JSON.parse(savedSections) as SectionConfig[];
      if (!Array.isArray(parsedSections) || parsedSections.length === 0) {
        router.push("/");
        return;
      }
    } catch {
      router.push("/");
      return;
    }

    setProblem(savedProblem);
    setSectionConfig(parsedSections);

    const cached = localStorage.getItem("last_report");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isLegacyReport(parsed)) {
          return;
        }
        const cachedReport = parsed as ReportJSON;
        if (
          cachedReport.metadata?.problem === savedProblem &&
          cachedReport.metadata?.sectionConfig &&
          sectionsConfigEqual(cachedReport.metadata.sectionConfig, parsedSections)
        ) {
          setReport(cachedReport);
          setStatus("done");
          hasFetchedRef.current = true;
        }
      } catch {
        // ignore bad cache
      }
    }
  }, [router]);

  useEffect(() => {
    if (!problem || sectionConfig.length === 0 || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    runPipeline(problem, sectionConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, sectionConfig]);

  const runPipeline = async (prob: string, sections: SectionConfig[]) => {
    setStatus("stage1");
    setAgentLog([]);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: prob, sections }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to start pipeline");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/^event: (.+)$/m);
          const dataMatch = chunk.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1].trim();
          let payload: unknown;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          if (eventType === "agent_log") {
            const entry = payload as AgentLogEntry;
            setAgentLog((prev) => {
              const idx = prev.findIndex((e) => e.agent === entry.agent);
              if (idx !== -1) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...entry };
                return next;
              }
              return [...prev, entry];
            });

            if (entry.stage === "stage1" && entry.status === "running") setStatus("stage1");
            if (entry.stage === "stage2" && entry.status === "running") setStatus("stage2");
            if (entry.stage === "stage3" && entry.status === "running") setStatus("stage3");
          }

          if (eventType === "complete") {
            const data = payload as { report: ReportJSON };
            setReport(data.report);
            setStatus("done");
          }

          if (eventType === "error") {
            const data = payload as { message: string };
            setError(data.message);
            setStatus("error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
      setStatus("error");
    }
  };

  const handleSectionSave = (sectionId: SectionId, updated: SectionData, instruction: string) => {
    if (!report) return;

    const currentContent = report.sections.find((s) => s.id === sectionId);
    if (!currentContent) return;

    const sectionHistory = versionHistory[sectionId] ?? [];
    const newEntry: EditVersionEntry = {
      version: sectionHistory.length + 1,
      content: currentContent,
      editInstruction: instruction,
      timestamp: new Date().toISOString(),
    };

    setVersionHistory((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), newEntry],
    }));

    setReport((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId ? updated : s
            ),
          }
        : prev
    );
  };

  const getOtherSections = (editingId: SectionId): Record<string, SectionData> => {
    if (!report) return {};
    const all: Record<string, SectionData> = {};
    for (const sec of report.sections) {
      if (sec.id !== editingId) {
        all[sec.id] = sec;
      }
    }
    return all;
  };

  const editingContent = report?.sections.find((s) => s.id === editingSection);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 font-sans pb-20 text-slate-900">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-orange-200/40 blur-3xl mix-blend-multiply" />
      </div>

      <header className="glass-light sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-orange-600 transition-colors bg-white px-2 py-1.5 rounded-lg border border-slate-200"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <p className="text-xs text-orange-600 uppercase tracking-widest font-black">Strategic Execution Plan</p>
              <h1 className="text-sm font-bold text-slate-800 max-w-xs md:max-w-md truncate">{problem}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === "done" && report && (
              <ExportButtons report={report} />
            )}
            <button
              onClick={() => {
                hasFetchedRef.current = false;
                localStorage.removeItem("last_report");
                runPipeline(problem, sectionConfig);
              }}
              className="p-2.5 text-slate-400 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 rounded-xl transition-all shadow-sm"
              title="Regenerate"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8C2 4.686 4.686 2 8 2C10.105 2 11.96 3.028 13.1 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 8C14 11.314 11.314 14 8 14C5.895 14 4.04 12.972 2.9 11.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M13 2L13 5L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14L3 11L6 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">
        {status !== "idle" && (
          <AgentPipeline status={status} agentLog={agentLog} />
        )}

        {status === "done" && agentLog.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-emerald-800">
                  Generated in {Math.round(
                    agentLog
                      .filter((e) => e.durationMs)
                      .reduce((max, e) => Math.max(max, e.durationMs ?? 0), 0) / 1000
                  )}s via {agentLog.filter((e) => e.status === "complete").length} AI agents
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {agentLog
                  .filter((e) => e.status === "complete")
                  .slice(0, 6)
                  .map((e, i) => (
                    <div
                      key={i}
                      className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-medium shadow-sm"
                      title={`${e.agent}: ${((e.durationMs ?? 0) / 1000).toFixed(1)}s`}
                    >
                      {e.agent.replace("section:", "").slice(0, 10)}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-red-800 mb-2 text-lg">Pipeline Error</h3>
            <p className="text-red-600 text-sm leading-relaxed">{error}</p>
            <button
              onClick={() => {
                hasFetchedRef.current = false;
                runPipeline(problem, sectionConfig);
              }}
              className="mt-4 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              Retry Generation
            </button>
          </div>
        )}

        {status !== "idle" && status !== "done" && status !== "error" && (
          <div className="space-y-6">
            {Array.from({ length: sectionConfig.length || 4 }, (_, i) => i + 1).map((i) => (
              <div key={i} className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded-full w-24" />
                  <div className="h-6 bg-slate-200 rounded-lg w-72" />
                  <div className="h-4 bg-slate-100 rounded-full w-full" />
                  <div className="h-4 bg-slate-100 rounded-full w-5/6" />
                  <div className="h-4 bg-slate-100 rounded-full w-4/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {report && (
          <div className="space-y-6 animate-fade-in-up">
            <ReportSections
              report={report}
              onEdit={(sectionId) => setEditingSection(sectionId)}
            />

            {report.metadata.references && report.metadata.references.length > 0 && (
              <section className="bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm border-l-[6px] border-l-slate-400">
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                      REF
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">References & Sources</h2>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <p className="text-sm text-slate-600 mb-6">The following sources were crawled by the AI agents during the research and synthesis phases using Gemini&apos;s native Google Search Grounding:</p>
                  <ul className="space-y-4">
                    {report.metadata.references.map((ref, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="text-slate-400 font-bold mt-0.5 text-xs">{i + 1}.</span>
                        <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline leading-relaxed break-words break-all">
                          {ref.title}
                          <span className="block text-xs text-slate-400 mt-0.5 no-underline font-normal">{ref.uri}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {editingSection && report && editingContent && (
        <SectionEditor
          sectionId={editingSection}
          currentContent={editingContent}
          problem={problem}
          otherSections={getOtherSections(editingSection)}
          history={versionHistory[editingSection] ?? []}
          onSave={(updated, instruction) =>
            handleSectionSave(editingSection, updated, instruction)
          }
          onClose={() => setEditingSection(null)}
        />
      )}
    </main>
  );
}
