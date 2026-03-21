// app/api/export/docx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildDocx } from "@/lib/docxBuilder";
import type { ReportJSON } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { report }: { report: ReportJSON } = await req.json();

  if (!report || !report.problemBreakdown) {
    return NextResponse.json({ error: "Invalid report data" }, { status: 400 });
  }

  try {
    const buffer = await buildDocx(report);
    const slug = report.metadata.problem
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const filename = `execution-plan-${slug}.docx`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DOCX generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
