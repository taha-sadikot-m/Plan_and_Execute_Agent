// lib/orchestrator.ts
// The brain — runs agents in optimal parallel/sequential stages

import { callAgent } from "./agentCaller";
import { mapWithConcurrency } from "./concurrency";
import {
  PLANNER_SYSTEM_PROMPT,
  DOMAIN_SYSTEM_PROMPT,
  RISK_SYSTEM_PROMPT,
  buildSynthesizerPrompt,
  buildDynamicSectionPrompt,
} from "./prompts";
import type {
  PlannerOutput,
  DomainOutput,
  RiskOutput,
  SynthesisOutput,
  ReportSection,
  ReportJSON,
  AgentLogEntry,
  SectionConfig,
} from "@/types";

const STAGE3_CONCURRENCY = 2;

function logEntry(
  stage: string,
  agent: string,
  status: AgentLogEntry["status"],
  durationMs?: number,
  thinkingContent?: string | null,
  retryMeta?: { retryDelayMs: number; retryAttempt: number }
): AgentLogEntry {
  return {
    stage,
    agent,
    status,
    durationMs,
    thinkingContent: thinkingContent || undefined,
    retryDelayMs: retryMeta?.retryDelayMs,
    retryAttempt: retryMeta?.retryAttempt,
    timestamp: new Date().toISOString(),
  };
}

function makeRetryHandler(
  stage: string,
  agent: string,
  onProgress?: (log: AgentLogEntry) => void
) {
  return ({ attempt, delayMs }: { attempt: number; delayMs: number }) => {
    onProgress?.(
      logEntry(stage, agent, "retrying", undefined, undefined, {
        retryDelayMs: delayMs,
        retryAttempt: attempt,
      })
    );
  };
}

export async function runPipeline(
  problem: string,
  sections: SectionConfig[],
  onProgress?: (log: AgentLogEntry) => void
): Promise<ReportJSON> {
  const agentLog: AgentLogEntry[] = [];
  const pipelineStart = Date.now();

  const log = (entry: AgentLogEntry) => {
    agentLog.push(entry);
    onProgress?.(entry);
  };

  const userMessage = `Problem statement: "${problem}"`;

  // ── STAGE 1: Sequential — one agent at a time, no grounding ────────────────

  log(logEntry("stage1", "planner", "running"));
  const plannerResult = await callAgent<PlannerOutput>({
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    userMessage,
    agentName: "planner",
    maxTokens: 8192,
    useGrounding: false,
    onRetry: makeRetryHandler("stage1", "planner", onProgress),
  });
  log(logEntry("stage1", "planner", "complete", plannerResult.durationMs, plannerResult.thinkingContent));

  log(logEntry("stage1", "risk", "running"));
  const riskResult = await callAgent<RiskOutput>({
    systemPrompt: RISK_SYSTEM_PROMPT,
    userMessage,
    agentName: "risk",
    maxTokens: 8192,
    useGrounding: false,
    onRetry: makeRetryHandler("stage1", "risk", onProgress),
  });
  log(logEntry("stage1", "risk", "complete", riskResult.durationMs, riskResult.thinkingContent));

  log(logEntry("stage1", "domain", "running"));
  const domainResult = await callAgent<DomainOutput>({
    systemPrompt: DOMAIN_SYSTEM_PROMPT,
    userMessage,
    agentName: "domain",
    maxTokens: 8192,
    useGrounding: false,
    onRetry: makeRetryHandler("stage1", "domain", onProgress),
  });
  log(logEntry("stage1", "domain", "complete", domainResult.durationMs, domainResult.thinkingContent));

  console.log(`[Pipeline] Stage 1 complete in ${Date.now() - pipelineStart}ms`);

  const allReferences: Array<{ title: string; uri: string }> = [];
  const addRefs = (result: { references?: Array<{ title: string; uri: string }> }) => {
    if (result.references) {
      allReferences.push(...result.references);
    }
  };
  addRefs(plannerResult);
  addRefs(domainResult);
  addRefs(riskResult);

  // ── STAGE 2: Synthesizer — single grounded research call ───────────────────

  const stage2Start = Date.now();
  log(logEntry("stage2", "synthesizer", "running"));

  const synthesizerPrompt = buildSynthesizerPrompt(
    plannerResult.data,
    domainResult.data,
    riskResult.data,
    problem,
    sections
  );

  const synthesisResult = await callAgent<SynthesisOutput>({
    systemPrompt: synthesizerPrompt,
    userMessage: "Synthesize the provided agent outputs into a strategic intelligence brief.",
    agentName: "synthesizer",
    maxTokens: 12288,
    useGrounding: true,
    onRetry: makeRetryHandler("stage2", "synthesizer", onProgress),
  });

  log(logEntry("stage2", "synthesizer", "complete", synthesisResult.durationMs, synthesisResult.thinkingContent));
  addRefs(synthesisResult);
  console.log(`[Pipeline] Stage 2 complete in ${Date.now() - stage2Start}ms`);

  // ── STAGE 3: Section writers — max 2 concurrent, grounded ────────────────

  const stage3Start = Date.now();
  const sectionUserMessage =
    "Write your assigned section based on the strategic context provided in the system prompt.";

  const sectionResults = await mapWithConcurrency(
    sections,
    STAGE3_CONCURRENCY,
    async (sec) => {
      log(logEntry("stage3", `section:${sec.title}`, "running"));

      const result = await callAgent<ReportSection>({
        systemPrompt: buildDynamicSectionPrompt(
          synthesisResult.data,
          problem,
          sec,
          synthesisResult.data.sectionGuidance[sec.id] ?? "",
          sections.length
        ),
        userMessage: sectionUserMessage,
        agentName: `section:${sec.title}`,
        maxTokens: 8192,
        useGrounding: true,
        onRetry: makeRetryHandler("stage3", `section:${sec.title}`, onProgress),
      });

      log(logEntry("stage3", `section:${sec.title}`, "complete", result.durationMs, result.thinkingContent));
      addRefs(result);
      return { sec, result };
    }
  );

  console.log(`[Pipeline] Stage 3 complete in ${Date.now() - stage3Start}ms`);
  console.log(`[Pipeline] Total pipeline time: ${Date.now() - pipelineStart}ms`);

  const uniqueRefs = Array.from(
    new Map(allReferences.map((r) => [r.uri, r])).values()
  );

  return {
    sections: sectionResults.map(({ result }) => result.data),
    metadata: {
      problem,
      sectionConfig: sections,
      generatedAt: new Date().toISOString(),
      agentLog,
      references: uniqueRefs,
    },
  };
}
