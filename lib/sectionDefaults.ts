import type { SectionConfig } from "@/types";

export const DEFAULT_SECTIONS: SectionConfig[] = [
  {
    id: "problemBreakdown",
    title: "Problem Breakdown",
    description:
      "Define the core problem, root causes, gaps in existing solutions, and the opportunity frame.",
  },
  {
    id: "stakeholders",
    title: "Stakeholders",
    description:
      "Identify key stakeholders, their motivations, power dynamics, and engagement strategies.",
  },
  {
    id: "solutionApproach",
    title: "Solution Approach",
    description:
      "Describe the strategic posture, core approach, pillars, differentiators, and tradeoffs.",
  },
  {
    id: "actionPlan",
    title: "Action Plan",
    description:
      "Provide phased milestones, quick wins, critical path, and resource requirements.",
  },
];

export const MIN_SECTIONS = 1;
export const MAX_SECTIONS = 8;

export function validateSections(sections: SectionConfig[]): string | null {
  if (!Array.isArray(sections) || sections.length < MIN_SECTIONS) {
    return `At least ${MIN_SECTIONS} section is required.`;
  }
  if (sections.length > MAX_SECTIONS) {
    return `Maximum ${MAX_SECTIONS} sections allowed.`;
  }
  for (const sec of sections) {
    if (!sec.id || typeof sec.id !== "string") {
      return "Each section must have a valid id.";
    }
    if (!sec.title || sec.title.trim().length < 2) {
      return "Each section title must be at least 2 characters.";
    }
    if (!sec.description || sec.description.trim().length < 10) {
      return "Each section description must be at least 10 characters.";
    }
  }
  return null;
}

export function sectionsConfigEqual(a: SectionConfig[], b: SectionConfig[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (sec, i) =>
      sec.id === b[i].id &&
      sec.title === b[i].title &&
      sec.description === b[i].description
  );
}

export function createSection(title = "", description = ""): SectionConfig {
  return {
    id: crypto.randomUUID(),
    title,
    description,
  };
}
