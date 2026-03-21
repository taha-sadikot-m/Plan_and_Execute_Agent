// lib/pdfTemplate.ts
// Generates a styled HTML string that html2pdf.js converts client-side

import type { ReportJSON, Phase } from "@/types";

export function buildPdfHtml(report: ReportJSON): string {
  const { problemBreakdown, stakeholders, solutionApproach, actionPlan, metadata } = report;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const influenceBadge = (level: string) => {
    const colors: Record<string, string> = {
      high: "#dc2626",
      medium: "#d97706",
      low: "#6b7280",
    };
    return `<span style="background:${colors[level] ?? "#6b7280"};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${level}</span>`;
  };

  const riskBadge = (level: string) => {
    const colors: Record<string, string> = {
      fatal: "#991b1b",
      high: "#dc2626",
      medium: "#d97706",
      low: "#16a34a",
    };
    return `<span style="background:${colors[level] ?? "#6b7280"};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${level}</span>`;
  };

  const phaseSection = (phase: Phase) => `
    <div style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px 24px;">
        <h3 style="color:white;margin:0;font-size:18px;">Phase ${phase.phaseNumber}: ${phase.phaseName}</h3>
        <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px;">${phase.timeHorizon}</p>
      </div>
      <div style="padding:20px 24px;">
        <p style="color:#374151;margin:0 0 16px;"><strong>Objective:</strong> ${phase.objective}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <thead>
            <tr style="background:#4f46e5;">
              ${["Milestone","Success Metric","Owner","Dependency"]
                .map(h => `<th style="color:white;padding:10px 12px;text-align:left;font-weight:600;">${h}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${phase.milestones.map((m, i) => `
              <tr style="background:${i % 2 === 0 ? "#f5f3ff" : "white"};">
                <td style="padding:10px 12px;color:#1f2937;font-weight:500;">${m.title}</td>
                <td style="padding:10px 12px;color:#374151;">${m.successMetric}</td>
                <td style="padding:10px 12px;color:#6b7280;">${m.owner}</td>
                <td style="padding:10px 12px;color:#6b7280;">${m.dependency ?? "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px;">
          <div><strong>Team:</strong> ${phase.resourceRequirements.team.join(", ")}</div>
          <div><strong>Budget:</strong> ${phase.resourceRequirements.budget}</div>
        </div>
        <div style="background:#ede9fe;border-left:4px solid #7c3aed;padding:12px 16px;border-radius:0 8px 8px 0;">
          <strong style="color:#5b21b6;">Phase Gate:</strong>
          <span style="color:#374151;margin-left:8px;">${phase.phaseGate}</span>
        </div>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: white; }
    .page { max-width: 900px; margin: 0 auto; padding: 48px 56px; }
    h1 { font-size: 42px; font-weight: 700; color: #1a1a2e; line-height: 1.2; }
    h2 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    h3 { font-size: 18px; font-weight: 600; color: #374151; }
    p { line-height: 1.7; color: #374151; }
    .section { margin-bottom: 48px; page-break-inside: avoid; }
    .section-header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; }
    .section-number { color: #6366f1; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
    .highlight-box { background: #ede9fe; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; margin: 2px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; line-height: 1.6; color: #374151; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; font-weight: 600; margin-bottom: 4px; }
    .page-break { page-break-before: always; padding-top: 48px; }
  </style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div style="min-height:200px;border-bottom:3px solid #4f46e5;margin-bottom:48px;padding-bottom:32px;">
    <div class="label">Strategic Execution Plan</div>
    <h1 style="margin:12px 0 16px;">${metadata.problem}</h1>
    <p style="color:#6b7280;font-size:14px;">Generated on ${formatDate(metadata.generatedAt)} · AI-Powered Multi-Agent Analysis</p>
  </div>

  <!-- Section 1: Problem Breakdown -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">Section 01</span>
      <h2>${problemBreakdown.headline}</h2>
    </div>

    <div class="highlight-box">
      <p><strong>${problemBreakdown.coreProblemStatement}</strong></p>
    </div>

    <h3 style="margin:24px 0 12px;">Root Cause Analysis</h3>
    ${problemBreakdown.rootCauses.map(rc => `
      <div class="card">
        <h3 style="color:#4f46e5;margin-bottom:8px;">${rc.cause}</h3>
        <p style="margin-bottom:8px;"><strong>Mechanism:</strong> ${rc.mechanism}</p>
        <p style="color:#6b7280;font-size:14px;"><strong>Evidence:</strong> ${rc.evidence}</p>
      </div>
    `).join("")}

    <h3 style="margin:24px 0 12px;">Why Existing Solutions Fall Short</h3>
    ${problemBreakdown.existingSolutionGaps.map(g => `
      <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
        <span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">${g.solution}</span>
        <p style="color:#374151;">${g.limitation}</p>
      </div>
    `).join("")}

    <h3 style="margin:24px 0 12px;">The Opportunity</h3>
    <p style="margin-bottom:16px;">${problemBreakdown.opportunityFrame}</p>
    <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:14px 18px;border-radius:0 8px 8px 0;">
      <strong style="color:#065f46;">📊 ${problemBreakdown.keyStatistic}</strong>
    </div>
  </div>

  <!-- Section 2: Stakeholders -->
  <div class="section page-break">
    <div class="section-header">
      <span class="section-number">Section 02</span>
      <h2>${stakeholders.headline}</h2>
    </div>
    <p style="margin-bottom:24px;">${stakeholders.overview}</p>

    <div class="grid-2">
      ${stakeholders.stakeholders.map(s => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <h3>${s.name}</h3>
            ${influenceBadge(s.influence)}
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:10px;">${s.role}</p>
          <div class="label">Pain Points</div>
          <ul style="margin-bottom:10px;">
            ${s.painPoints.map(p => `<li style="font-size:13px;">${p}</li>`).join("")}
          </ul>
          <div class="label">Success Criteria</div>
          <p style="font-size:13px;margin-bottom:10px;">${s.successCriteria}</p>
          <div class="label">Engagement Strategy</div>
          <p style="font-size:13px;color:#4f46e5;">${s.engagementStrategy}</p>
        </div>
      `).join("")}
    </div>

    <div class="card" style="margin-top:16px;">
      <h3 style="margin-bottom:8px;">Power Dynamics</h3>
      <p>${stakeholders.powerDynamics}</p>
    </div>
    <div class="highlight-box" style="margin-top:16px;">
      <strong>Alignment Strategy:</strong> ${stakeholders.alignmentStrategy}
    </div>
  </div>

  <!-- Section 3: Solution Approach -->
  <div class="section page-break">
    <div class="section-header">
      <span class="section-number">Section 03</span>
      <h2>${solutionApproach.headline}</h2>
    </div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
      <span class="label" style="margin:0;">Strategic posture:</span>
      <span class="tag" style="background:#dbeafe;color:#1d4ed8;font-size:13px;">${solutionApproach.strategicPosture}</span>
    </div>
    <p style="margin-bottom:24px;">${solutionApproach.coreApproach}</p>

    <h3 style="margin-bottom:16px;">Solution Pillars</h3>
    ${solutionApproach.pillars.map((p, i) => `
      <div class="card" style="border-left:4px solid #6366f1;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:#6366f1;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${i+1}</span>
          <div>
            <h3 style="color:#4f46e5;margin-bottom:6px;">${p.title}</h3>
            <p style="margin-bottom:8px;">${p.description}</p>
            <p style="font-size:13px;color:#6b7280;margin-bottom:8px;"><em>${p.rationale}</em></p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${p.keyActivities.map(a => `<span class="tag">${a}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
    `).join("")}

    <div class="grid-2" style="margin-top:24px;">
      <div>
        <h3 style="margin-bottom:12px;">Differentiators</h3>
        <ul>${solutionApproach.differentiators.map(d => `<li>${d}</li>`).join("")}</ul>
      </div>
      <div>
        <h3 style="margin-bottom:12px;">Key Tradeoffs</h3>
        ${solutionApproach.tradeoffs.map(t => `
          <div style="margin-bottom:12px;padding:10px;background:#fff7ed;border-radius:6px;border:1px solid #fed7aa;">
            <p style="font-size:12px;color:#9a3412;margin-bottom:4px;font-weight:600;">${t.decision}</p>
            <p style="font-size:13px;"><strong>Chose:</strong> ${t.chose}</p>
            <p style="font-size:12px;color:#6b7280;">Tradeoff: ${t.tradeoff}</p>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <!-- Section 4: Action Plan -->
  <div class="section page-break">
    <div class="section-header">
      <span class="section-number">Section 04</span>
      <h2>${actionPlan.headline}</h2>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:32px;">
      <h3 style="color:#15803d;margin-bottom:12px;">⚡ Quick Wins (First 2 Weeks)</h3>
      <ul>${actionPlan.quickWins.map(w => `<li>${w}</li>`).join("")}</ul>
    </div>

    ${actionPlan.phases.map(phase => phaseSection(phase)).join("")}

    <div class="card">
      <h3 style="margin-bottom:12px;">Critical Path</h3>
      <ol style="padding-left:20px;">
        ${actionPlan.criticalPath.map(c => `<li style="margin-bottom:8px;">${c}</li>`).join("")}
      </ol>
    </div>
  </div>

</div>
</body>
</html>
  `;
}
