// app/api/agent/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { callAgent } from "@/lib/agentCaller";
import { buildEditorPrompt } from "@/lib/prompts";
import type { EditRequest, SectionData } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body: EditRequest = await req.json();
  const { sectionId, currentContent, editInstruction, problem, otherSections } = body;

  if (!sectionId || !currentContent || !editInstruction || !problem) {
    return NextResponse.json(
      { error: "Missing required fields: sectionId, currentContent, editInstruction, problem" },
      { status: 400 }
    );
  }

  if (editInstruction.trim().length < 3) {
    return NextResponse.json(
      { error: "Edit instruction is too short." },
      { status: 400 }
    );
  }

  try {
    const systemPrompt = buildEditorPrompt(
      sectionId,
      currentContent,
      editInstruction,
      problem,
      otherSections
    );

    const result = await callAgent<SectionData>({
      systemPrompt,
      userMessage: `Edit the "${currentContent.title}" section as instructed. Return the complete updated section as JSON.`,
      agentName: "editor",
      maxTokens: 3500,
    });

    return NextResponse.json({
      updatedSection: result.data,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
