// app/api/export/pdf/route.ts
// Returns the styled HTML — client uses html2pdf.js to render it
import { NextRequest, NextResponse } from "next/server";
import { buildPdfHtml } from "@/lib/pdfTemplate";
import type { ReportJSON } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { report }: { report: ReportJSON } = await req.json();

  if (!report || !report.problemBreakdown) {
    return NextResponse.json({ error: "Invalid report data" }, { status: 400 });
  }

  try {
    const html = buildPdfHtml(report);
    return NextResponse.json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF template generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
