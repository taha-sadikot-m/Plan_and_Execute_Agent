// lib/pdfTemplate.ts
// Generates a proper vector PDF with selectable text using PDFKit

import PDFDocument from "pdfkit";
import type { ReportJSON, Phase } from "@/types";

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


export async function buildPdfBuffer(report: ReportJSON): Promise<Buffer> {
  const { problemBreakdown, stakeholders, solutionApproach, actionPlan, metadata } = report;

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
    // SECTION 1: PROBLEM BREAKDOWN
    // ═══════════════════════════════════════════════════════════════════════
    sectionHead(doc, "01", problemBreakdown.headline, C.orange);

    subHead(doc, "Core Problem Statement");
    // Pre-compute box height then draw bg first, then text on top
    const stmtY = doc.y;
    doc.font("Helvetica").fontSize(9.5);
    const stmtH = doc.heightOfString(problemBreakdown.coreProblemStatement, { width: CONTENT_W - 32 }) + 22;
    doc.save()
      .roundedRect(MARGIN, stmtY, CONTENT_W, stmtH, 6)
      .fill(C.bgLight);
    doc.restore();
    doc.save()
      .roundedRect(MARGIN, stmtY, CONTENT_W, stmtH, 6)
      .lineWidth(1).strokeColor(C.border).stroke();
    doc.restore();
    doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
      .text(problemBreakdown.coreProblemStatement, MARGIN + 16, stmtY + 11, {
        width: CONTENT_W - 32,
      });
    doc.y = stmtY + stmtH + 6;

    subHead(doc, "Root Cause Analysis");
    problemBreakdown.rootCauses.forEach((rc, i) => {
      ensureSpace(doc, 70);
      // Number badge + cause title
      const rcY = doc.y;
      doc.save().circle(MARGIN + 8, rcY + 7, 8).fill(C.orange).restore();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white)
        .text(`${i + 1}`, MARGIN + 5, rcY + 3, { width: 7, align: "center" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.primary)
        .text(rc.cause, MARGIN + 22, rcY + 1, { width: CONTENT_W - 22 });
      doc.moveDown(0.3);

      // Mechanism
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.subtle)
        .text("MECHANISM", MARGIN + 22, doc.y, { width: CONTENT_W - 22 });
      doc.font("Helvetica").fontSize(9).fillColor(C.body)
        .text(rc.mechanism, MARGIN + 22, doc.y + 2, { width: CONTENT_W - 32, lineGap: 2 });
      doc.moveDown(0.3);

      // Evidence
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.subtle)
        .text("EVIDENCE", MARGIN + 22, doc.y, { width: CONTENT_W - 22 });
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(C.muted)
        .text(rc.evidence, MARGIN + 22, doc.y + 2, { width: CONTENT_W - 32, lineGap: 2 });

      // Separator (not after last)
      if (i < problemBreakdown.rootCauses.length - 1) {
        doc.moveDown(0.6);
        hRule(doc);
      } else {
        doc.moveDown(0.5);
      }
    });

    subHead(doc, "Why Existing Solutions Fail");
    problemBreakdown.existingSolutionGaps.forEach(g => {
      // Measure at actual render width & font, add lineGap:2 compensation (~1.2×)
      doc.font("Helvetica-Bold").fontSize(9);
      const solTitleH = doc.heightOfString(g.solution, { width: CONTENT_W - 24 });
      doc.font("Helvetica").fontSize(9);
      const limH = Math.ceil(doc.heightOfString(g.limitation, { width: CONTENT_W - 24 }) * 1.2);
      // 10 (top) + solTitleH + 4 (gap) + limH + 10 (bottom)
      const gapH = 10 + solTitleH + 4 + limH + 10;
      ensureSpace(doc, gapH + 8);
      const gapY = doc.y;
      doc.save().roundedRect(MARGIN, gapY, CONTENT_W, gapH, 5).fill("#fff7ed").restore();
      doc.save().roundedRect(MARGIN, gapY, CONTENT_W, gapH, 5).lineWidth(0.5).strokeColor("#fed7aa").stroke().restore();
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#9a3412")
        .text(g.solution, MARGIN + 12, gapY + 10, { width: CONTENT_W - 24 });
      doc.font("Helvetica").fontSize(9).fillColor(C.body)
        .text(g.limitation, MARGIN + 12, gapY + 10 + solTitleH + 4, { width: CONTENT_W - 24, lineGap: 2 });
      doc.y = gapY + gapH + 8;
    });

    subHead(doc, "The Opportunity");
    // Dark opportunity box
    ensureSpace(doc, 50);
    const oppY = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(C.body);
    const oppH = doc.heightOfString(problemBreakdown.opportunityFrame, { width: CONTENT_W - 32 }) + 34;
    doc.save().roundedRect(MARGIN, oppY, CONTENT_W, oppH, 8).fill(C.primary);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#818cf8")
      .text("THE OPPORTUNITY", MARGIN + 16, oppY + 10, { width: CONTENT_W - 32 });
    doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1")
      .text(problemBreakdown.opportunityFrame, MARGIN + 16, doc.y + 2, { width: CONTENT_W - 32 });
    doc.y = oppY + oppH + 8;

    // Key statistic box
    ensureSpace(doc, 30);
    const statY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.greenDark);
    const statH = doc.heightOfString(problemBreakdown.keyStatistic, { width: CONTENT_W - 28 }) + 18;
    doc.save().roundedRect(MARGIN, statY, CONTENT_W, statH, 5).fill(C.greenBg);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.greenDark)
      .text(problemBreakdown.keyStatistic, MARGIN + 14, statY + 9, { width: CONTENT_W - 28 });
    doc.y = statY + statH + 8;

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: STAKEHOLDERS
    // ═══════════════════════════════════════════════════════════════════════
    sectionHead(doc, "02", stakeholders.headline, C.indigo);
    bodyText(doc, stakeholders.overview);

    stakeholders.stakeholders.forEach((s, si) => {
      ensureSpace(doc, 80);
      // Influence bar color
      const barColor = s.influence === "high" ? C.purple :
                        s.influence === "medium" ? C.subtle : C.border;
      const shY = doc.y;
      doc.save()
        .rect(MARGIN, shY, 3, 14)
        .fill(barColor)
        .restore();

      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.primary)
        .text(s.name, MARGIN + 10, shY, { width: CONTENT_W - 10 });
      doc.moveDown(0.1);

      // Role + influence
      const infLabel = s.influence === "high" ? "High Influence" : s.influence === "medium" ? "Medium Influence" : "Low Influence";
      doc.font("Helvetica").fontSize(8.5).fillColor(C.muted)
        .text(`${s.role}  ·  ${infLabel}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10 });
      doc.moveDown(0.35);

      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.subtle)
        .text("PAIN POINTS", MARGIN + 10, doc.y, { width: CONTENT_W - 10 });
      doc.moveDown(0.1);
      bullets(doc, s.painPoints, 10);

      labeledLine(doc, "Success Criteria", s.successCriteria, MARGIN + 10);
      doc.moveDown(0.15);

      // Engagement strategy box (purple-tinted)
      ensureSpace(doc, 50);
      const engY = doc.y;
      const engInnerW = CONTENT_W - 40; // box spans MARGIN+10 → MARGIN+CONTENT_W-10, text at +20 inside
      doc.font("Helvetica").fontSize(8.5);
      const engText = s.engagementStrategy;
      const engTextH = doc.heightOfString(engText, { width: engInnerW });
      // 9 (top) + 9 (label 7pt) + 4 (gap) + engTextH + 10 (bottom)
      const engH = engTextH + 32;
      doc.save().roundedRect(MARGIN + 10, engY, CONTENT_W - 20, engH, 5).fill(C.purpleBg);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.purpleDark)
        .text("ENGAGEMENT STRATEGY", MARGIN + 20, engY + 9, { width: engInnerW });
      doc.font("Helvetica").fontSize(8.5).fillColor("#581c87")
        .text(engText, MARGIN + 20, engY + 22, { width: engInnerW });
      doc.y = engY + engH + 12;

      // Divider between stakeholders (not after last)
      if (si < stakeholders.stakeholders.length - 1) {
        hRule(doc);
      }
    });

    // Power dynamics & alignment
    subHead(doc, "Power Dynamics");
    bodyText(doc, stakeholders.powerDynamics);
    subHead(doc, "Alignment Strategy");
    bodyText(doc, stakeholders.alignmentStrategy);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: SOLUTION APPROACH
    // ═══════════════════════════════════════════════════════════════════════
    sectionHead(doc, "03", solutionApproach.headline, C.sky);

    // Strategic posture badge
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#92400e")
      .text(`${solutionApproach.strategicPosture.toUpperCase()} POSTURE`, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.3);
    bodyText(doc, solutionApproach.coreApproach);

    subHead(doc, "Strategic Pillars");
    solutionApproach.pillars.forEach(p => {
      // Measure with ACTUAL font sizes and widths used during rendering,
      // then add lineGap compensation so the card never clips content.
      doc.font("Helvetica-Bold").fontSize(10.5);
      const titleH = doc.heightOfString(p.title, { width: CONTENT_W - 28 });
      doc.font("Helvetica").fontSize(9.5);
      const descH  = doc.heightOfString(p.description, { width: CONTENT_W - 28 });
      doc.font("Helvetica-Oblique").fontSize(8.5);
      const ratH   = doc.heightOfString(p.rationale, { width: CONTENT_W - 44 });
      doc.font("Helvetica").fontSize(8.5);
      const actH   = doc.heightOfString(p.keyActivities.join("   ·   "), { width: CONTENT_W - 28 });

      // lineGap adds extra height per line; multiply by ~1.35 / 1.25 as compensation.
      // Structure: top(12) + title + gap(8) + desc + gap(9) + RATIONALE‑label(10)
      //            + rat + gap(9) + ACTIVITIES‑label(10) + act + bottom(14)
      const cardH = 12
        + Math.ceil(titleH * 1.15) + 8
        + Math.ceil(descH  * 1.35) + 9
        + 11 + Math.ceil(ratH * 1.25) + 9
        + 11 + Math.ceil(actH * 1.25) + 14;

      ensureSpace(doc, cardH + 10);
      const cardY = doc.y;

      // Draw card background + border
      doc.save().roundedRect(MARGIN, cardY, CONTENT_W, cardH, 6).fill(C.bgLight).restore();
      doc.save().roundedRect(MARGIN, cardY, CONTENT_W, cardH, 6).lineWidth(0.75).strokeColor(C.border).stroke().restore();
      // Left accent bar
      doc.save().rect(MARGIN, cardY, 3, cardH).fill(C.sky).restore();

      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.primary)
        .text(p.title, MARGIN + 14, cardY + 12, { width: CONTENT_W - 28 });
      doc.moveDown(0.35);
      doc.font("Helvetica").fontSize(9.5).fillColor("#475569")
        .text(p.description, MARGIN + 14, doc.y, { width: CONTENT_W - 28, lineGap: 3 });
      doc.moveDown(0.4);
      // Rationale
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.subtle)
        .text("RATIONALE", MARGIN + 14, doc.y, { width: CONTENT_W - 28 });
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(C.muted)
        .text(p.rationale, MARGIN + 14, doc.y + 3, { width: CONTENT_W - 44, lineGap: 2 });
      doc.moveDown(0.4);
      // Activities
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.subtle)
        .text("KEY ACTIVITIES", MARGIN + 14, doc.y, { width: CONTENT_W - 28 });
      doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
        .text(p.keyActivities.join("   ·   "), MARGIN + 14, doc.y + 4, { width: CONTENT_W - 28, lineGap: 2 });

      // Always advance past the pre-drawn card boundary
      doc.y = Math.max(doc.y + 8, cardY + cardH + 12);
    });

    subHead(doc, "Key Differentiators");
    bullets(doc, solutionApproach.differentiators);

    subHead(doc, "Acknowledged Tradeoffs");
    solutionApproach.tradeoffs.forEach(t => {
      const halfW = (CONTENT_W - 32) / 2;
      // Measure all text at actual render font sizes
      doc.font("Helvetica-Bold").fontSize(9);
      const decH  = doc.heightOfString(t.decision, { width: CONTENT_W - 20 });
      doc.font("Helvetica").fontSize(8.5);
      const choseH = doc.heightOfString(t.chose,     { width: halfW - 16 });
      const sacH   = doc.heightOfString(t.tradeoff,  { width: halfW - 16 });
      // pill interior: 7 (top pad) + 10 (label) + 3 (gap) + text + 10 (bottom)
      const pillH = Math.max(choseH, sacH) + 30;
      // full card: 10 (top) + decision + 8 (gap) + pill + 10 (bottom)
      const tfH = 10 + decH + 8 + pillH + 10;

      ensureSpace(doc, tfH + 10);
      const tfY = doc.y;

      // Outer card
      doc.save().roundedRect(MARGIN, tfY, CONTENT_W, tfH, 5).fill("#f8fafc").restore();
      doc.save().roundedRect(MARGIN, tfY, CONTENT_W, tfH, 5).lineWidth(0.5).strokeColor(C.border).stroke().restore();

      // Decision title (drawn at explicit Y so position is known below)
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.primary)
        .text(t.decision, MARGIN + 10, tfY + 10, { width: CONTENT_W - 20 });

      // Both pill boxes start at the same Y (derived from tfY, not doc.y)
      const pillY = tfY + 10 + decH + 8;

      // CHOSE pill
      doc.save().roundedRect(MARGIN + 10, pillY, halfW, pillH, 4).fill("#f0fdf4").restore();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.greenDark)
        .text("CHOSE", MARGIN + 16, pillY + 7, { width: halfW - 16 });
      doc.font("Helvetica").fontSize(8.5).fillColor(C.greenDark)
        .text(t.chose, MARGIN + 16, pillY + 20, { width: halfW - 16 });

      // SACRIFICED pill — uses explicit pillY, never relies on doc.y
      const sacX = MARGIN + 10 + halfW + 12;
      doc.save().roundedRect(sacX, pillY, halfW, pillH, 4).fill("#fef2f2").restore();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#991b1b")
        .text("SACRIFICED", sacX + 6, pillY + 7, { width: halfW - 16 });
      doc.font("Helvetica").fontSize(8.5).fillColor("#991b1b")
        .text(t.tradeoff, sacX + 6, pillY + 20, { width: halfW - 16 });

      doc.y = tfY + tfH + 8;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: ACTION PLAN
    // ═══════════════════════════════════════════════════════════════════════
    sectionHead(doc, "04", actionPlan.headline, C.emerald);

    // Quick wins box
    ensureSpace(doc, 70);
    const qwY = doc.y;
    // Measure items at actual render font size
    doc.font("Helvetica").fontSize(9);
    const qwItems = actionPlan.quickWins.map(w => `•  ${w}`).join("\n");
    const qwTextH = doc.heightOfString(qwItems, { width: CONTENT_W - 36 });
    // 10 (top) + 13 (title at 9.5pt-bold) + 4 (gap) + qwTextH + 12 (bottom)
    const qwH = qwTextH + 39;
    doc.save().roundedRect(MARGIN, qwY, CONTENT_W, qwH, 8).fill(C.greenBg);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.greenDark)
      .text("Quick Wins (First 2 Weeks)", MARGIN + 16, qwY + 10, { width: CONTENT_W - 32 });
    doc.font("Helvetica").fontSize(9).fillColor(C.greenDark)
      .text(qwItems, MARGIN + 16, qwY + 27, { width: CONTENT_W - 36 });
    doc.y = qwY + qwH + 10;

    // Phases
    actionPlan.phases.forEach((phase: Phase) => {
      const phaseColor = PHASE_COLORS[(phase.phaseNumber - 1) % PHASE_COLORS.length];

      // Phase header: only add a page if we have substantial existing content.
      // Prevents double-blank-pages when ensureSpace() inside drawTable or the
      // previous phase's resources/gate block just moved us to a fresh page.
      if (doc.y > MARGIN + 200) {
        doc.addPage();
      }
      const phY = doc.y;
      doc.save().roundedRect(MARGIN, phY, CONTENT_W, 32, 8).fill(phaseColor);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white)
        .text(`Phase ${phase.phaseNumber}: ${phase.phaseName}`, MARGIN + 14, phY + 8, {
          width: CONTENT_W - 140,
        });
      // Time horizon badge — PDFKit doesn't support rgba, use white directly
      doc.font("Helvetica").fontSize(8).fillColor(C.white)
        .text(phase.timeHorizon, MARGIN + CONTENT_W - 120, phY + 10, {
          width: 106,
          align: "right",
        });
      doc.y = phY + 40;

      labeledLine(doc, "Objective", phase.objective);
      doc.moveDown(0.3);

      // Milestone table
      const colW = [CONTENT_W * 0.28, CONTENT_W * 0.32, CONTENT_W * 0.2, CONTENT_W * 0.2];
      drawTable(
        doc,
        ["Milestone", "Success Metric", "Owner", "Dependency"],
        phase.milestones.map(m => [m.title, m.successMetric, m.owner, m.dependency ?? "—"]),
        colW,
      );

      // Pre-compute BOTH heights so we can do a single ensureSpace check.
      // This prevents resources from landing on one near-blank page and
      // the gate landing on another, each leaving mostly-blank pages.
      const resTeam   = `Team: ${phase.resourceRequirements.team.join(", ")}`;
      const resTools  = `Tools: ${phase.resourceRequirements.tools.join(", ")}`;
      const resBudget = `Budget: ${phase.resourceRequirements.budget}`;
      doc.font("Helvetica").fontSize(8);
      const resH = doc.heightOfString(`${resTeam}\n${resTools}\n${resBudget}`, { width: CONTENT_W - 24 }) + 18;
      doc.font("Helvetica").fontSize(8.5);
      const pgH = doc.heightOfString(phase.phaseGate, { width: CONTENT_W - 40 }) + 26;

      // Single page-break decision for the entire resources + gate block
      ensureSpace(doc, resH + pgH + 22);

      // Resources row
      const resY = doc.y;
      doc.save().roundedRect(MARGIN, resY, CONTENT_W, resH, 4).fill(C.bgLight).restore();
      doc.save().roundedRect(MARGIN, resY, CONTENT_W, resH, 4).lineWidth(0.5).strokeColor(C.border).stroke().restore();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted)
        .text(resTeam,  MARGIN + 12, resY + 9,  { width: CONTENT_W - 24 });
      doc.font("Helvetica").fontSize(8).fillColor(C.body)
        .text(resTools,  MARGIN + 12, doc.y + 2, { width: CONTENT_W - 24 });
      doc.font("Helvetica").fontSize(8).fillColor(C.body)
        .text(resBudget, MARGIN + 12, doc.y + 2, { width: CONTENT_W - 24 });
      doc.y = resY + resH + 8;

      // Phase gate (no separate ensureSpace — already checked above)
      const pgY = doc.y;
      // pgH was pre-computed above; reuse it here
      doc.save()
        .rect(MARGIN, pgY, 4, pgH).fill(C.purple)
        .roundedRect(MARGIN + 4, pgY, CONTENT_W - 4, pgH, 5).fill(C.purpleBg);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.purpleDark)
        .text("PHASE GATE", MARGIN + 14, pgY + 7, { width: CONTENT_W - 28 });
      doc.font("Helvetica").fontSize(8.5).fillColor("#581c87")
        .text(phase.phaseGate, MARGIN + 14, doc.y + 2, { width: CONTENT_W - 28 });
      doc.y = pgY + pgH + 10;
    });

    // Critical path
    ensureSpace(doc, 60);
    subHead(doc, "Critical Path Dependencies");
    actionPlan.criticalPath.forEach((c, i) => {
      ensureSpace(doc, 28);
      const cpY = doc.y;
      // Number circle
      doc.save().circle(MARGIN + 9, cpY + 8, 8).fill(C.emerald).restore();
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.white)
        .text(`${i + 1}`, MARGIN + 6, cpY + 4, { width: 8, align: "center" });
      doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
        .text(c, MARGIN + 24, cpY + 2, { width: CONTENT_W - 30, lineGap: 2 });
      doc.moveDown(0.35);
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
