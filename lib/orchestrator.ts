// lib/orchestrator.ts
// The brain — runs agents in optimal parallel/sequential stages

import { callAgent } from "./agentCaller";
import {
  PLANNER_SYSTEM_PROMPT,
  DOMAIN_SYSTEM_PROMPT,
  RISK_SYSTEM_PROMPT,
  buildSynthesizerPrompt,
  buildProblemBreakdownPrompt,
  buildStakeholdersPrompt,
  buildSolutionApproachPrompt,
  buildActionPlanPrompt,
} from "./prompts";
import type {
  PlannerOutput,
  DomainOutput,
  RiskOutput,
  SynthesisOutput,
  ProblemBreakdownSection,
  StakeholdersSection,
  SolutionApproachSection,
  ActionPlanSection,
  ReportJSON,
  AgentLogEntry,
} from "@/types";

function logEntry(
  stage: string,
  agent: string,
  status: AgentLogEntry["status"],
  durationMs?: number,
  thinkingContent?: string | null
): AgentLogEntry {
  return {
    stage,
    agent,
    status,
    durationMs,
    thinkingContent: thinkingContent || undefined,
    timestamp: new Date().toISOString(),
  };
}

export async function runPipeline(
  problem: string,
  onProgress?: (log: AgentLogEntry) => void
): Promise<ReportJSON> {
  const agentLog: AgentLogEntry[] = [];

  const log = (entry: AgentLogEntry) => {
    agentLog.push(entry);
    onProgress?.(entry);
  };

  // ── STAGE 1: Three agents run in parallel ──────────────────────────────────
  // Total time = slowest single agent, NOT sum of all three

  log(logEntry("stage1", "planner", "running"));
  log(logEntry("stage1", "domain", "running"));
  log(logEntry("stage1", "risk", "running"));

  const userMessage = `Problem statement: "${problem}"`;

  const [plannerResult, domainResult, riskResult] = await Promise.all([
    callAgent<PlannerOutput>({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userMessage,
      agentName: "planner",
      maxTokens: 8192,
    }),
    callAgent<DomainOutput>({
      systemPrompt: DOMAIN_SYSTEM_PROMPT,
      userMessage,
      agentName: "domain",
      maxTokens: 8192,
    }),
    callAgent<RiskOutput>({
      systemPrompt: RISK_SYSTEM_PROMPT,
      userMessage,
      agentName: "risk",
      maxTokens: 8192,
    }),
  ]);

  log(logEntry("stage1", "planner", "complete", plannerResult.durationMs, plannerResult.thinkingContent));
  log(logEntry("stage1", "domain", "complete", domainResult.durationMs, domainResult.thinkingContent));
  log(logEntry("stage1", "risk", "complete", riskResult.durationMs, riskResult.thinkingContent));

  const allReferences: Array<{ title: string; uri: string }> = [];
  const addRefs = (result: { references?: Array<{ title: string; uri: string }> }) => {
    if (result.references) {
      allReferences.push(...result.references);
    }
  };
  addRefs(plannerResult);
  addRefs(domainResult);
  addRefs(riskResult);

  // ── STAGE 2: Synthesizer — sequential (needs all Stage 1 outputs) ──────────

  log(logEntry("stage2", "synthesizer", "running"));

  const synthesizerPrompt = buildSynthesizerPrompt(
    plannerResult.data,
    domainResult.data,
    riskResult.data,
    problem
  );

  const synthesisResult = await callAgent<SynthesisOutput>({
    systemPrompt: synthesizerPrompt,
    userMessage: "Synthesize the provided agent outputs into a strategic intelligence brief.",
    agentName: "synthesizer",
    maxTokens: 8192,
  });

  log(logEntry("stage2", "synthesizer", "complete", synthesisResult.durationMs, synthesisResult.thinkingContent));
  addRefs(synthesisResult);

  // ── STAGE 3: Four section writers run in parallel ──────────────────────────
  // Each gets synthesis context but writes ONLY its assigned section

  log(logEntry("stage3", "section:problemBreakdown", "running"));
  log(logEntry("stage3", "section:stakeholders", "running"));
  log(logEntry("stage3", "section:solutionApproach", "running"));
  log(logEntry("stage3", "section:actionPlan", "running"));

  const sectionUserMessage =
    "Write your assigned section based on the strategic context provided in the system prompt.";

  const [
    problemBreakdownResult,
    stakeholdersResult,
    solutionApproachResult,
    actionPlanResult,
  ] = await Promise.all([
    callAgent<ProblemBreakdownSection>({
      systemPrompt: buildProblemBreakdownPrompt(synthesisResult.data, problem),
      userMessage: sectionUserMessage,
      agentName: "section:problemBreakdown",
      maxTokens: 8192,
    }),
    callAgent<StakeholdersSection>({
      systemPrompt: buildStakeholdersPrompt(synthesisResult.data, problem),
      userMessage: sectionUserMessage,
      agentName: "section:stakeholders",
      maxTokens: 8192,
    }),
    callAgent<SolutionApproachSection>({
      systemPrompt: buildSolutionApproachPrompt(synthesisResult.data, problem),
      userMessage: sectionUserMessage,
      agentName: "section:solutionApproach",
      maxTokens: 8192,
    }),
    callAgent<ActionPlanSection>({
      systemPrompt: buildActionPlanPrompt(synthesisResult.data, problem),
      userMessage: sectionUserMessage,
      agentName: "section:actionPlan",
      maxTokens: 8192,
    }),
  ]);

  log(logEntry("stage3", "section:problemBreakdown", "complete", problemBreakdownResult.durationMs, problemBreakdownResult.thinkingContent));
  log(logEntry("stage3", "section:stakeholders", "complete", stakeholdersResult.durationMs, stakeholdersResult.thinkingContent));
  log(logEntry("stage3", "section:solutionApproach", "complete", solutionApproachResult.durationMs, solutionApproachResult.thinkingContent));
  log(logEntry("stage3", "section:actionPlan", "complete", actionPlanResult.durationMs, actionPlanResult.thinkingContent));

  addRefs(problemBreakdownResult);
  addRefs(stakeholdersResult);
  addRefs(solutionApproachResult);
  addRefs(actionPlanResult);

  // De-duplicate references by URI
  const uniqueRefs = Array.from(
    new Map(allReferences.map(r => [r.uri, r])).values()
  );

  return {
    problemBreakdown: problemBreakdownResult.data,
    stakeholders: stakeholdersResult.data,
    solutionApproach: solutionApproachResult.data,
    actionPlan: actionPlanResult.data,
    metadata: {
      problem,
      generatedAt: new Date().toISOString(),
      agentLog,
      references: uniqueRefs,
    },
  };
}
