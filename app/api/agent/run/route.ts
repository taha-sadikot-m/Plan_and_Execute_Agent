// app/api/agent/run/route.ts
// Streams pipeline progress via Server-Sent Events

import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/orchestrator";
import { validateSections } from "@/lib/sectionDefaults";
import type { AgentLogEntry, SectionConfig } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { problem, sections } = body as {
    problem?: string;
    sections?: SectionConfig[];
  };

  if (!problem || typeof problem !== "string" || problem.trim().length < 10) {
    return new Response(
      JSON.stringify({ error: "Problem statement must be at least 10 characters." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const sectionError = validateSections(sections ?? []);
  if (sectionError) {
    return new Response(JSON.stringify({ error: sectionError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        send("status", { message: "Pipeline started", stage: "init" });

        const report = await runPipeline(
          problem.trim(),
          sections!,
          (logEntry: AgentLogEntry) => {
            send("agent_log", logEntry);
          }
        );

        send("complete", { report });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown pipeline error";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
