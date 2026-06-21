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
import type { ReportJSON, ContentBlock, ReportSection } from "@/types";

const COLORS = {
  primary: "0f172a",
  body: "334155",
  muted: "64748b",
  subtle: "94a3b8",
  border: "e2e8f0",
  bgLight: "f8fafc",
  white: "ffffff",
  orange: "f97316",
  indigo: "6366f1",
  sky: "0ea5e9",
  emerald: "10b981",
  purple: "a855f7",
  blue: "2563eb",
  violet: "7c3aed",
};

const SECTION_ACCENT_COLORS = [
  COLORS.orange,
  COLORS.indigo,
  COLORS.sky,
  COLORS.emerald,
  COLORS.purple,
  COLORS.blue,
  COLORS.violet,
  "166534",
];

function sectionHeading(text: string, accentColor?: string): Paragraph {
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
        color: accentColor ?? COLORS.indigo,
        size: 6,
        style: BorderStyle.SINGLE,
        space: 4,
      },
    },
  });
}

function subHeading(text: string, color?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: color ?? COLORS.primary,
        font: "Calibri",
      }),
    ],
    spacing: { before: 280, after: 120 },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri", color: COLORS.body })],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bulletItem(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: "Calibri", color: COLORS.body })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

function blockToParagraphs(block: ContentBlock): (Paragraph | Table)[] {
  switch (block.type) {
    case "paragraph":
      return [bodyText(block.content ?? "")];

    case "subheading":
      return block.content && block.title
        ? [subHeading(block.title), bodyText(block.content)]
        : [subHeading(block.title ?? block.content ?? "")];

    case "bullets":
      return [
        ...(block.title ? [subHeading(block.title)] : []),
        ...(block.items ?? []).map((item) => bulletItem(item)),
      ];

    case "numbered":
      return [
        ...(block.title ? [subHeading(block.title)] : []),
        ...(block.items ?? []).map((item, i) => bulletItem(`${i + 1}. ${item}`)),
      ];

    case "table": {
      const rows = block.rows ?? [];
      const tableRows = [
        new TableRow({
          children: ["Item", "Details"].map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: h, bold: true, size: 18, color: COLORS.muted, font: "Calibri" }),
                    ],
                  }),
                ],
                shading: { fill: COLORS.bgLight, type: ShadingType.CLEAR, color: "auto" },
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              })
          ),
        }),
        ...rows.map(
          (row, i) =>
            new TableRow({
              children: [row.label, row.value].map(
                (val) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: val, size: 17, font: "Calibri" })],
                      }),
                    ],
                    shading: {
                      fill: i % 2 === 0 ? COLORS.bgLight : COLORS.white,
                      type: ShadingType.CLEAR,
                      color: "auto",
                    },
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  })
              ),
            })
        ),
      ];
      return [
        ...(block.title ? [subHeading(block.title)] : []),
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80 },
        }),
        new Paragraph({ children: [], spacing: { after: 120 } }),
      ];
    }

    case "callout":
      return [
        new Paragraph({
          children: [
            ...(block.title
              ? [
                  new TextRun({
                    text: `${block.title.toUpperCase()}\n`,
                    size: 18,
                    bold: true,
                    color: COLORS.orange,
                    font: "Calibri",
                  }),
                ]
              : []),
            new TextRun({
              text: block.content ?? "",
              size: 20,
              color: COLORS.body,
              font: "Calibri",
            }),
          ],
          spacing: { before: 200, after: 200 },
          shading: { fill: "fff7ed", type: ShadingType.CLEAR, color: "auto" },
          indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
        }),
      ];

    default:
      return [];
  }
}

function sectionToParagraphs(section: ReportSection, index: number): (Paragraph | Table)[] {
  const accent = SECTION_ACCENT_COLORS[index % SECTION_ACCENT_COLORS.length];
  const out: (Paragraph | Table)[] = [
    sectionHeading(`${index + 1}. ${section.headline}`, accent),
  ];
  for (const block of section.blocks) {
    out.push(...blockToParagraphs(block));
  }
  return out;
}

export async function buildDocx(report: ReportJSON): Promise<Buffer> {
  const { sections, metadata } = report;

  const docChildren: (Paragraph | Table)[] = [
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
  ];

  sections.forEach((section, index) => {
    if (index > 0) {
      docChildren.push(pageBreak());
    }
    docChildren.push(...sectionToParagraphs(section, index));
  });

  if (metadata.references && metadata.references.length > 0) {
    docChildren.push(pageBreak());
    docChildren.push(sectionHeading("References & Sources", COLORS.muted));
    docChildren.push(
      bodyText(
        "The following sources were crawled by the AI agents during the research and synthesis phases using Gemini's native Google Search Grounding:"
      )
    );
    metadata.references.forEach((ref, i) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 20, font: "Calibri", color: COLORS.muted }),
            new TextRun({ text: ref.title, bold: true, size: 20, font: "Calibri", color: COLORS.primary }),
          ],
          spacing: { after: 40 },
        })
      );
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: ref.uri, size: 16, font: "Calibri", color: COLORS.muted })],
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
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
