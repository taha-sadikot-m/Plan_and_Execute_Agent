// lib/pdfTemplate.ts
// Generates a proper vector PDF with selectable text using PDFKit

import PDFDocument from "pdfkit";
import type { ReportJSON, ContentBlock, ReportSection } from "@/types";

// ── Color palette matching GUI ──────────────────────────────────────────────
const C = {
  primary: "#0f172a",   // slate-900
  body: "#334155",      // slate-700
  muted: "#64748b",     // slate-500
  subtle: "#94a3b8",    // slate-400
  border: "#e2e8f0",    // slate-200
  bgLight: "#f8fafc",   // slate-50
  white: "#ffffff",
  orange: "#f97316",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  emerald: "#10b981",
  purple: "#a855f7",
  purpleDark: "#7e22ce",
  greenDark: "#166534",
  greenBg: "#f0fdf4",
  purpleBg: "#faf5ff",
  blue: "#2563eb",
  indigoDark: "#4f46e5",
  violet: "#7c3aed",
};

const MARGIN = 50;
const PAGE_W = 595.28;  // A4
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Phase header colors
const PHASE_COLORS = [C.blue, C.indigoDark, C.violet];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Check if we need a new page (returns true if page was added) */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): boolean {
  if (doc.y + needed > PAGE_H - MARGIN - 30) {
    doc.addPage();
    return true;
  }
  return false;
}

/** Draw a subtle horizontal rule */
function hRule(doc: PDFKit.PDFDocument, color = C.border) {
  doc.save()
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_W, doc.y)
    .lineWidth(0.5).strokeColor(color).stroke()
    .restore();
  doc.y += 8;
}

/** Draw a colored accent line */
function accentLine(doc: PDFKit.PDFDocument, color: string, width = CONTENT_W) {
  doc.save()
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + width, doc.y)
    .lineWidth(3)
    .strokeColor(color)
    .stroke()
    .restore();
  doc.y += 8;
}

/** Section heading with badge + accent underline */
function sectionHead(doc: PDFKit.PDFDocument, badge: string, title: string, accentColor: string) {
  // Only add a new page if we're past 60px below the top margin.
  // Prevents double-blank-pages when ensureSpace() just added a fresh page
  // and drew a small terminal item before this section header.
  if (doc.y > MARGIN + 60) {
    doc.addPage();
  }
  // Accent bar at top of page
  doc.save().rect(MARGIN, MARGIN - 20, CONTENT_W, 3).fill(accentColor).restore();

  // Badge
  doc.font("Helvetica-Bold").fontSize(7);
  const bw = doc.widthOfString(badge) + 12;
  doc.save()
    .roundedRect(MARGIN, doc.y, bw, 15, 3)
    .fill(accentColor);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.white)
    .text(badge, MARGIN + 6, doc.y + 4, { width: bw });
  doc.y += 20;

  // Title
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.primary)
    .text(title, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.3);

  accentLine(doc, accentColor);
  doc.moveDown(0.3);
}

/** Sub-heading */
function subHead(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.primary)
    .text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.35);
}

/** Body paragraph */
function bodyText(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
    .text(text, MARGIN, doc.y, { width: CONTENT_W, align: "justify", lineGap: 3 });
  doc.moveDown(0.55);
}

/** Labeled line: "Label: value" */
function labeledLine(doc: PDFKit.PDFDocument, label: string, value: string, x = MARGIN) {
  ensureSpace(doc, 18);
  const lw = doc.font("Helvetica-Bold").fontSize(9).widthOfString(`${label}: `);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.primary)
    .text(`${label}: `, x, doc.y, { continued: true, width: CONTENT_W - (x - MARGIN) });
  doc.font("Helvetica").fontSize(9).fillColor(C.body)
    .text(value, { width: CONTENT_W - lw - (x - MARGIN), lineGap: 2 });
  doc.moveDown(0.3);
}

/** Bullet list */
function bullets(doc: PDFKit.PDFDocument, items: string[], indent = 0) {
  const x = MARGIN + 10 + indent;
  for (const item of items) {
    ensureSpace(doc, 20);
    doc.font("Helvetica").fontSize(9).fillColor(C.body)
      .text(`•  ${item}`, x, doc.y, { width: CONTENT_W - (x - MARGIN) - 10, lineGap: 2 });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.1);
}

/** Draw a shaded box */
function shadedBox(doc: PDFKit.PDFDocument, bgColor: string, borderColor: string | null, draw: () => void) {
  const startY = doc.y;
  // Measure height by drawing off-screen first — approximation approach
  // We draw directly and then background underneath via save/restore
  const savedY = doc.y;

  // Draw content first to measure
  draw();
  const endY = doc.y;
  const h = endY - startY + 10;

  // Now draw background behind
  // PDFKit doesn't support z-ordering, so we used a workaround:
  // Draw box first by going back
  doc.y = savedY;
  // Use a separate approach: draw box and re-draw text
  // Actually, let's use the simpler approach of pre-computing

  doc.y = endY + 5;
}

/** Simple table */
function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths?: number[]) {
  const totalW = CONTENT_W;
  const cols = headers.length;
  const cw = colWidths ?? headers.map(() => totalW / cols);
  const padX = 6;
  const padY = 5;
  const fontSize = 8;

  // Ensure enough space for header + at least 2 rows
  ensureSpace(doc, 80);

  let x = MARGIN;
  let y = doc.y;

  // Header row
  const headerH = 22;
  for (let i = 0; i < cols; i++) {
    doc.save()
      .rect(x, y, cw[i], headerH)
      .fill(C.bgLight);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted)
      .text(headers[i].toUpperCase(), x + padX, y + padY + 2, {
        width: cw[i] - padX * 2,
      });
    x += cw[i];
  }
  y += headerH;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    // Measure row height
    let maxH = 18;
    for (let c = 0; c < cols; c++) {
      const h = doc.font("Helvetica").fontSize(fontSize)
        .heightOfString(rows[r][c] || "—", { width: cw[c] - padX * 2 });
      maxH = Math.max(maxH, h + padY * 2);
    }

    // Check page break — leave 30px above the footer line (773.89)
    if (y + maxH > PAGE_H - MARGIN - 30) {
      doc.addPage();
      y = doc.y;
      // Re-draw header on new page
      x = MARGIN;
      for (let i = 0; i < cols; i++) {
        doc.save().rect(x, y, cw[i], headerH).fill(C.bgLight);
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted)
          .text(headers[i].toUpperCase(), x + padX, y + padY + 2, { width: cw[i] - padX * 2 });
        x += cw[i];
      }
      y += headerH;
    }

    x = MARGIN;
    // Alternate row bg
    if (r % 2 === 0) {
      doc.save().rect(MARGIN, y, totalW, maxH).fill("#fafafa").restore();
    }
    // Border bottom
    doc.save().moveTo(MARGIN, y + maxH).lineTo(MARGIN + totalW, y + maxH)
      .lineWidth(0.5).strokeColor(C.border).stroke().restore();

    for (let c = 0; c < cols; c++) {
      const fontName = c === 0 ? "Helvetica-Bold" : "Helvetica";
      const color = c === 0 ? C.primary : (c >= 2 ? C.muted : C.body);
      doc.font(fontName).fontSize(fontSize).fillColor(color)
        .text(rows[r][c] || "—", x + padX, y + padY, {
          width: cw[c] - padX * 2,
        });
      x += cw[c];
    }
    y += maxH;
  }

  doc.y = y + 8;
}


const SECTION_ACCENT_COLORS = [C.orange, C.indigo, C.sky, C.emerald, C.purple, C.blue, C.violet, C.greenDark];

function renderBlock(doc: PDFKit.PDFDocument, block: ContentBlock) {
  switch (block.type) {
    case "paragraph":
      bodyText(doc, block.content ?? "");
      break;
    case "subheading":
      subHead(doc, block.title ?? block.content ?? "");
      if (block.content && block.title) {
        bodyText(doc, block.content);
      }
      break;
    case "bullets":
      if (block.title) subHead(doc, block.title);
      bullets(doc, block.items ?? []);
      break;
    case "numbered":
      if (block.title) subHead(doc, block.title);
      (block.items ?? []).forEach((item, i) => {
        ensureSpace(doc, 20);
        doc.font("Helvetica").fontSize(9).fillColor(C.body)
          .text(`${i + 1}.  ${item}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10, lineGap: 2 });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.1);
      break;
    case "table":
      if (block.title) subHead(doc, block.title);
      drawTable(
        doc,
        ["Item", "Details"],
        (block.rows ?? []).map((r) => [r.label, r.value]),
        [CONTENT_W * 0.35, CONTENT_W * 0.65]
      );
      break;
    case "callout": {
      const calloutY = doc.y;
      const calloutText = block.content ?? "";
      doc.font("Helvetica").fontSize(9.5);
      const calloutH = doc.heightOfString(
        (block.title ? `${block.title}\n` : "") + calloutText,
        { width: CONTENT_W - 28 }
      ) + 24;
      ensureSpace(doc, calloutH);
      doc.save()
        .roundedRect(MARGIN, calloutY, CONTENT_W, calloutH, 6)
        .fill("#fff7ed");
      doc.restore();
      doc.save()
        .roundedRect(MARGIN, calloutY, CONTENT_W, calloutH, 6)
        .lineWidth(1).strokeColor(C.orange).stroke();
      doc.restore();
      if (block.title) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange)
          .text(block.title.toUpperCase(), MARGIN + 14, calloutY + 10, { width: CONTENT_W - 28 });
      }
      doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
        .text(calloutText, MARGIN + 14, block.title ? calloutY + 24 : calloutY + 10, {
          width: CONTENT_W - 28,
        });
      doc.y = calloutY + calloutH + 8;
      break;
    }
  }
}

function renderSection(
  doc: PDFKit.PDFDocument,
  section: ReportSection,
  badge: string,
  accentColor: string
) {
  sectionHead(doc, badge, section.headline, accentColor);
  for (const block of section.blocks) {
    renderBlock(doc, block);
  }
}

export async function buildPdfBuffer(report: ReportJSON): Promise<Buffer> {
  const { sections, metadata } = report;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: "Strategic Execution Plan",
        Subject: metadata.problem,
        Creator: "Plan & Execute Agent",
      },
      bufferPages: true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ═══════════════════════════════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════════════════════════════
    // Cover: top accent bar
    doc.save().rect(MARGIN, MARGIN, CONTENT_W, 4).fill(C.orange).restore();
    // Cover: bottom accent bar
    doc.save().rect(MARGIN, PAGE_H - MARGIN - 4, CONTENT_W, 4).fill(C.orange).restore();

    doc.y = 240;
    doc.font("Helvetica-Bold").fontSize(28).fillColor(C.primary)
      .text("Strategic Execution Plan", MARGIN, doc.y, {
        width: CONTENT_W,
        align: "center",
      });
    doc.moveDown(0.5);
    // Thin divider under main title
    doc.save()
      .moveTo(PAGE_W / 2 - 60, doc.y)
      .lineTo(PAGE_W / 2 + 60, doc.y)
      .lineWidth(1.5).strokeColor(C.orange).stroke()
      .restore();
    doc.y += 14;
    doc.font("Helvetica").fontSize(12).fillColor(C.muted)
      .text(metadata.problem, MARGIN, doc.y, {
        width: CONTENT_W,
        align: "center",
      });
    doc.moveDown(2);
    // Metadata block
    const metaY = doc.y;
    doc.save().roundedRect(PAGE_W / 2 - 100, metaY, 200, 48, 6).fill(C.bgLight).restore();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted)
      .text("GENERATED ON", PAGE_W / 2 - 80, metaY + 10, { width: 160, align: "center" });
    doc.font("Helvetica").fontSize(9.5).fillColor(C.primary)
      .text(formatDate(metadata.generatedAt), PAGE_W / 2 - 80, doc.y + 4, { width: 160, align: "center" });
    doc.y = metaY + 60;

    // ═══════════════════════════════════════════════════════════════════════
    // DYNAMIC SECTIONS
    // ═══════════════════════════════════════════════════════════════════════
    sections.forEach((section, index) => {
      const badge = String(index + 1).padStart(2, "0");
      const accent = SECTION_ACCENT_COLORS[index % SECTION_ACCENT_COLORS.length];
      renderSection(doc, section, badge, accent);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // REFERENCES
    // ═══════════════════════════════════════════════════════════════════════

    if (metadata.references && metadata.references.length > 0) {
      sectionHead(doc, "REF", "References & Sources", C.muted);
      doc.font("Helvetica").fontSize(8.5).fillColor(C.muted)
        .text("Sources crawled by AI agents during research using Google Search Grounding:", MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.4);

      metadata.references.forEach((ref, i) => {
        ensureSpace(doc, 34);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.primary)
          .text(`${i + 1}.  ${ref.title}`, MARGIN + 8, doc.y, { width: CONTENT_W - 16 });
        doc.moveDown(0.15);
        doc.font("Helvetica").fontSize(8).fillColor(C.muted)
          .text(ref.uri, MARGIN + 20, doc.y, { width: CONTENT_W - 28 });
        doc.moveDown(0.4);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE NUMBERS (bufferPages:true lets us go back through all pages)
    // ═══════════════════════════════════════════════════════════════════════
    const range = doc.bufferedPageRange();
    // Footer Y must be INSIDE the usable area (0 .. PAGE_H - MARGIN = 791.89).
    // Using PAGE_H - MARGIN + anything would cross the boundary and cause
    // PDFKit to auto-create a blank continuation page for every text call.
    const FOOTER_LINE_Y = PAGE_H - MARGIN - 18;  // 773.89
    const FOOTER_TEXT_Y = PAGE_H - MARGIN - 12;  // 779.89
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Skip cover page (page 0)
      if (i === 0) continue;
      // Footer line
      doc.save()
        .moveTo(MARGIN, FOOTER_LINE_Y)
        .lineTo(MARGIN + CONTENT_W, FOOTER_LINE_Y)
        .lineWidth(0.5).strokeColor(C.border).stroke()
        .restore();
      // Document title (left) — lineBreak:false prevents any chance of wrapping
      doc.font("Helvetica").fontSize(7.5).fillColor(C.subtle)
        .text("Strategic Execution Plan", MARGIN, FOOTER_TEXT_Y, {
          width: CONTENT_W / 2,
          lineBreak: false,
        });
      // Page number (right)
      doc.font("Helvetica").fontSize(7.5).fillColor(C.subtle)
        .text(`${i} / ${range.count - 1}`, MARGIN, FOOTER_TEXT_Y, {
          width: CONTENT_W,
          align: "right",
          lineBreak: false,
        });
    }

    // Finalize
    doc.end();
  });
}
