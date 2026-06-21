// ─── Agent Output Types ───────────────────────────────────────────────────────

export interface SubProblem {
  id: string;
  title: string;
  description: string;
  complexity: "low" | "medium" | "high";
}

export interface StakeholderCategory {
  name: string;
  relationship: "primary" | "secondary" | "regulatory";
  hasVetoPower: boolean;
}

export interface PlannerOutput {
  domain: string;
  coreTension: string;
  subProblems: SubProblem[];
  stakeholderCategories: StakeholderCategory[];
  constraints: {
    technical: string[];
    business: string[];
    regulatory: string[];
    time: string[];
  };
  problemType: "technical" | "business" | "hybrid" | "sociotechnical";
  confidenceScore: number;
}

export interface DomainOutput {
  industry: string;
  subSector: string;
  marketSignals: {
    tam: string;
    growthTrend: "growing" | "stable" | "declining";
    maturity: "emerging" | "growth" | "mature" | "declining";
  };
  precedents: Array<{
    company: string;
    outcome: "success" | "failure" | "pivoted";
    keyLesson: string;
  }>;
  tailwinds: string[];
  headwinds: string[];
  regulatoryFlags: string[];
  differentiationVectors: string[];
}

export interface RiskItem {
  id: string;
  category: "technical" | "market" | "execution" | "regulatory" | "financial";
  title: string;
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high" | "fatal";
  mitigation: string;
  earlyWarningSignal: string;
}

export interface RiskOutput {
  riskProfile: {
    overallRiskLevel: "low" | "medium" | "high" | "very_high";
    primaryKillerRisk: string;
  };
  risks: RiskItem[];
  criticalAssumptions: Array<{
    assumption: string;
    validationMethod: string;
  }>;
}

export interface KeyInsight {
  insight: string;
  sourceAgents: string[];
  implication: string;
}

export interface SynthesisOutput {
  strategicNarrative: string;
  keyInsights: KeyInsight[];
  strategicPosture: "aggressive" | "conservative" | "adaptive";
  postureRationale: string;
  criticalPathItems: string[];
  watchOutFor: string[];
  opportunityHighlights: string[];
  sectionGuidance: Record<string, string>;
}

// ─── Section Configuration (user-defined) ─────────────────────────────────────

export interface SectionConfig {
  id: string;
  title: string;
  description: string;
}

// ─── Report Section Types (AI-generated, generic block model) ─────────────────

export interface ContentBlock {
  type: "paragraph" | "subheading" | "bullets" | "numbered" | "table" | "callout";
  title?: string;
  content?: string;
  items?: string[];
  rows?: Array<{ label: string; value: string }>;
}

export interface ReportSection {
  id: string;
  title: string;
  description: string;
  headline: string;
  blocks: ContentBlock[];
}

// ─── Full Report ──────────────────────────────────────────────────────────────

export interface ReportJSON {
  sections: ReportSection[];
  metadata: {
    problem: string;
    sectionConfig: SectionConfig[];
    generatedAt: string;
    agentLog: AgentLogEntry[];
    references: Array<{ title: string; uri: string }>;
  };
}

// ─── Pipeline State ───────────────────────────────────────────────────────────

export interface AgentLogEntry {
  stage: string;
  agent: string;
  status: "running" | "complete" | "error" | "retrying";
  durationMs?: number;
  thinkingContent?: string;
  retryDelayMs?: number;
  retryAttempt?: number;
  timestamp: string;
}

export type PipelineStatus =
  | "idle"
  | "stage1"
  | "stage2"
  | "stage3"
  | "assembling"
  | "done"
  | "error";

export interface PipelineState {
  status: PipelineStatus;
  agentLog: AgentLogEntry[];
  report: ReportJSON | null;
  error: string | null;
}

// ─── Edit Types ───────────────────────────────────────────────────────────────

export type SectionId = string;

export type SectionData = ReportSection;

export interface EditRequest {
  sectionId: SectionId;
  currentContent: SectionData;
  editInstruction: string;
  problem: string;
  otherSections: Record<string, SectionData>;
}

export interface EditVersionEntry {
  version: number;
  content: SectionData;
  editInstruction: string;
  timestamp: string;
}

export interface SectionVersionHistory {
  [sectionId: string]: EditVersionEntry[];
}
