// app/api/export/pdf/route.ts
// Generates a proper vector PDF with selectable text server-side
import { NextRequest, NextResponse } from "next/server";
import { buildPdfBuffer } from "@/lib/pdfTemplate";
import type { ReportJSON } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { report }: { report: ReportJSON } = await req.json();

  if (!report || !report.sections?.length) {
    return NextResponse.json({ error: "Invalid report data" }, { status: 400 });
  }

  try {
    const buffer = await buildPdfBuffer(report);
    const slug = report.metadata.problem
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const filename = `execution-plan-${slug}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
