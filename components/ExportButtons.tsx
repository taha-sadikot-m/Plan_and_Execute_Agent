"use client";
// components/ExportButtons.tsx
import { useState } from "react";
import type { ReportJSON } from "@/types";

interface Props {
  report: ReportJSON;
}

export function ExportButtons({ report }: Props) {
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDocxExport = async () => {
    setExportingDocx(true);
    setError(null);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });

      if (!res.ok) throw new Error("DOCX export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = report.metadata.problem.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `execution-plan-${slug}.docx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePdfExport = async () => {
    setExportingPdf(true);
    setError(null);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = report.metadata.problem.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `execution-plan-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs font-semibold text-red-600 text-right">{error}</p>
      )}
      <div className="flex gap-2.5">
        <button
          onClick={handleDocxExport}
          disabled={exportingDocx}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all shadow-sm"
        >
          {exportingDocx ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M10 2V5H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 8V12M6 10L8 12L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {exportingDocx ? "Exporting..." : "DOCX"}
        </button>

        <button
          onClick={handlePdfExport}
          disabled={exportingPdf}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-sm font-bold hover:from-orange-500 hover:to-amber-400 hover:shadow-md hover:shadow-orange-500/20 disabled:opacity-40 transition-all shadow-sm"
        >
          {exportingPdf ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M10 2V5H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 9H11M5 11H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {exportingPdf ? "Generating..." : "PDF"}
        </button>
      </div>
    </div>
  );
}
