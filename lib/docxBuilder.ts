// lib/docxBuilder.ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  convertInchesToTwip,
  PageBreak,
} from "docx";
import type { ReportJSON, Phase, Milestone } from "@/types";

const COLORS = {
  primary: "1a1a2e",
  accent: "6366f1",
  accentLight: "e0e7ff",
  muted: "6b7280",
  border: "e5e7eb",
  white: "ffffff",
};

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.primary,
        font: "Calibri",
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: {
        color: COLORS.accent,
        size: 6,
        style: BorderStyle.SINGLE,
        space: 4,
      },
    },
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: COLORS.accent,
        font: "Calibri",
      }),
    ],
    spacing: { before: 280, after: 120 },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri", color: COLORS.primary })],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bulletItem(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri", color: COLORS.primary })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function labeledText(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: "Calibri", color: COLORS.accent }),
      new TextRun({ text: value, size: 20, font: "Calibri", color: COLORS.primary }),
    ],
    spacing: { after: 100 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

function milestoneTable(milestones: Milestone[]): Table {
  const headerRow = new TableRow({
    children: ["Milestone", "Success Metric", "Owner", "Dependency"].map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 18, color: COLORS.white, font: "Calibri" })],
            }),
          ],
          shading: { fill: COLORS.accent, type: ShadingType.CLEAR, color: COLORS.accent },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        })
    ),
  });

  const dataRows = milestones.map(
    (m, i) =>
      new TableRow({
        children: [m.title, m.successMetric, m.owner, m.dependency ?? "—"].map(
          (val) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: val, size: 17, font: "Calibri" })],
                }),
              ],
              shading: {
                fill: i % 2 === 0 ? COLORS.accentLight : COLORS.white,
                type: ShadingType.CLEAR,
                color: "auto",
              },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
            })
        ),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80 },
  });
}

export async function buildDocx(report: ReportJSON): Promise<Buffer> {
  const { problemBreakdown, stakeholders, solutionApproach, actionPlan, metadata } = report;

  const sections: (Paragraph | Table)[] = [
    // Cover
    new Paragraph({
      children: [
        new TextRun({
          text: "Strategic Execution Plan",
          bold: true,
          size: 52,
          color: COLORS.primary,
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: metadata.problem,
          size: 26,
          color: COLORS.muted,
          font: "Calibri",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date(metadata.generatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          size: 18,
          color: COLORS.muted,
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    pageBreak(),

    // ── Section 1: Problem Breakdown ────────────────────────────────────────
    sectionHeading(`1. ${problemBreakdown.headline}`),
    subHeading("Core Problem Statement"),
    bodyText(problemBreakdown.coreProblemStatement),
    subHeading("Root Cause Analysis"),
    ...problemBreakdown.rootCauses.flatMap((rc) => [
      new Paragraph({
        children: [new TextRun({ text: rc.cause, bold: true, size: 20, font: "Calibri", color: COLORS.primary })],
        spacing: { before: 160, after: 60 },
      }),
      labeledText("Mechanism", rc.mechanism),
      labeledText("Evidence", rc.evidence),
    ]),
    subHeading("Why Existing Solutions Fall Short"),
    ...problemBreakdown.existingSolutionGaps.map((g) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${g.solution}: `, bold: true, size: 20, font: "Calibri", color: COLORS.primary }),
          new TextRun({ text: g.limitation, size: 20, font: "Calibri", color: COLORS.muted }),
        ],
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    ),
    subHeading("The Opportunity"),
    bodyText(problemBreakdown.opportunityFrame),
    new Paragraph({
      children: [
        new TextRun({
          text: `📊 ${problemBreakdown.keyStatistic}`,
          size: 20,
          bold: true,
          color: COLORS.accent,
          font: "Calibri",
        }),
      ],
      spacing: { before: 200, after: 200 },
      shading: { fill: COLORS.accentLight, type: ShadingType.CLEAR, color: "auto" },
      indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
    }),
    pageBreak(),

    // ── Section 2: Stakeholders ──────────────────────────────────────────────
    sectionHeading(`2. ${stakeholders.headline}`),
    bodyText(stakeholders.overview),
    ...stakeholders.stakeholders.flatMap((s) => [
      subHeading(s.name),
      labeledText("Role", s.role),
      labeledText("Influence", s.influence.toUpperCase()),
      new Paragraph({
        children: [new TextRun({ text: "Pain Points:", bold: true, size: 20, font: "Calibri" })],
        spacing: { before: 100, after: 60 },
      }),
      ...s.painPoints.map((p) => bulletItem(p)),
      labeledText("Success Criteria", s.successCriteria),
      labeledText("Engagement Strategy", s.engagementStrategy),
    ]),
    subHeading("Power Dynamics"),
    bodyText(stakeholders.powerDynamics),
    subHeading("Alignment Strategy"),
    bodyText(stakeholders.alignmentStrategy),
    pageBreak(),

    // ── Section 3: Solution Approach ─────────────────────────────────────────
    sectionHeading(`3. ${solutionApproach.headline}`),
    labeledText("Strategic Posture", solutionApproach.strategicPosture),
    bodyText(solutionApproach.coreApproach),
    subHeading("Solution Pillars"),
    ...solutionApproach.pillars.flatMap((p) => [
      new Paragraph({
        children: [new TextRun({ text: p.title, bold: true, size: 22, color: COLORS.primary, font: "Calibri" })],
        spacing: { before: 200, after: 80 },
      }),
      bodyText(p.description),
      labeledText("Rationale", p.rationale),
      new Paragraph({
        children: [new TextRun({ text: "Key Activities:", bold: true, size: 20, font: "Calibri" })],
        spacing: { before: 80, after: 60 },
      }),
      ...p.keyActivities.map((a) => bulletItem(a, 1)),
    ]),
    subHeading("Differentiators"),
    ...solutionApproach.differentiators.map((d) => bulletItem(d)),
    subHeading("Key Tradeoffs"),
    ...solutionApproach.tradeoffs.flatMap((t) => [
      new Paragraph({
        children: [
          new TextRun({ text: `Decision: `, bold: true, size: 20, font: "Calibri", color: COLORS.accent }),
          new TextRun({ text: t.decision, size: 20, font: "Calibri" }),
        ],
        spacing: { before: 120, after: 40 },
      }),
      labeledText("Chose", t.chose),
      labeledText("Tradeoff", t.tradeoff),
    ]),
    pageBreak(),

    // ── Section 4: Action Plan ───────────────────────────────────────────────
    sectionHeading(`4. ${actionPlan.headline}`),
    subHeading("Quick Wins (First 2 Weeks)"),
    ...actionPlan.quickWins.map((w) => bulletItem(w)),
    ...actionPlan.phases.flatMap((phase: Phase) => [
      subHeading(`Phase ${phase.phaseNumber}: ${phase.phaseName} — ${phase.timeHorizon}`),
      labeledText("Objective", phase.objective),
      new Paragraph({
        children: [new TextRun({ text: "Milestones:", bold: true, size: 20, font: "Calibri" })],
        spacing: { before: 150, after: 100 },
      }),
      milestoneTable(phase.milestones),
      new Paragraph({ children: [], spacing: { after: 120 } }),
      subHeading("Resources Required"),
      labeledText("Team", phase.resourceRequirements.team.join(", ")),
      labeledText("Tools", phase.resourceRequirements.tools.join(", ")),
      labeledText("Budget", phase.resourceRequirements.budget),
      new Paragraph({
        children: [
          new TextRun({ text: "Phase Gate: ", bold: true, size: 20, color: COLORS.accent, font: "Calibri" }),
          new TextRun({ text: phase.phaseGate, size: 20, font: "Calibri", italics: true }),
        ],
        spacing: { before: 200, after: 200 },
        shading: { fill: COLORS.accentLight, type: ShadingType.CLEAR, color: "auto" },
        indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
      }),
    ]),
    subHeading("Critical Path"),
    ...actionPlan.criticalPath.map((c, i) => bulletItem(`${i + 1}. ${c}`)),
  ];

  if (metadata.references && metadata.references.length > 0) {
    sections.push(pageBreak());
    sections.push(sectionHeading("References & Sources"));
    sections.push(
      bodyText(
        "The following sources were crawled by the AI agents during the research and synthesis phases using Gemini's native Google Search Grounding:"
      )
    );
    metadata.references.forEach((ref, i) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 20, font: "Calibri", color: COLORS.muted }),
            new TextRun({ text: ref.title, bold: true, size: 20, font: "Calibri", color: COLORS.accent }),
          ],
          spacing: { after: 40 },
        })
      );
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: ref.uri, size: 16, font: "Calibri", color: COLORS.muted }),
          ],
          spacing: { after: 160 },
          indent: { left: convertInchesToTwip(0.3) },
        })
      );
    });
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1.2),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
