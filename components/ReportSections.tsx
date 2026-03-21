"use client";
// components/ReportSections.tsx
import type {
  ReportJSON,
  SectionId,
  ProblemBreakdownSection,
  StakeholdersSection,
  SolutionApproachSection,
  ActionPlanSection,
} from "@/types";

interface SectionWrapperProps {
  id: SectionId;
  title: string;
  badge: string;
  accentColor: string;
  onEdit: (id: SectionId) => void;
  children: React.ReactNode;
}

function SectionWrapper({ id, title, badge, accentColor, onEdit, children }: SectionWrapperProps) {
  return (
    <section className={`bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm border-l-[6px] ${accentColor}`}>
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500`}>
            {badge}
          </span>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
        <button
          onClick={() => onEdit(id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 2L12 4.5M2 10.5L2.5 12H4L12 4.5L9.5 2L2 9.5V10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit with AI
        </button>
      </div>
      <div className="px-8 py-6">{children}</div>
    </section>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{children}</p>
  );
}

// ── Section renderers ──────────────────────────────────────────────────────────

function ProblemBreakdownView({ section: breakdown, report }: { section: ProblemBreakdownSection, report: ReportJSON }) {
  return (
    <div className="space-y-8">
            <p className="text-slate-700 text-[15px] leading-relaxed mb-8"><RenderText text={breakdown.coreProblemStatement} report={report} /></p>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                Root Causes
              </h3>
              <ul className="space-y-4">
                {breakdown.rootCauses.map((rc, i) => (
                  <li key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
                    <span className="font-bold text-slate-300 mt-0.5">{i + 1}.</span>
                    <div>
                      <strong className="text-slate-800 block mb-1"><RenderText text={rc.cause} report={report} /></strong>
                      <span className="text-sm text-slate-600 block mb-2"><RenderText text={rc.mechanism} report={report} /></span>
                      <em className="text-xs text-slate-500 font-medium tracking-wide block bg-white px-2 py-1 rounded-md border border-slate-100 inline-block">Evidence: <RenderText text={rc.evidence} report={report} /></em>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                Why Existing Solutions Fail
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {breakdown.existingSolutionGaps.map((gap, i) => (
                  <li key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <strong className="text-slate-800 text-sm block mb-1"><RenderText text={gap.solution} report={report} /></strong>
                    <span className="text-xs text-slate-600"><RenderText text={gap.limitation} report={report} /></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
              <strong className="block text-xs uppercase tracking-widest text-indigo-300 mb-2">The Opportunity</strong>
              <p className="text-[15px] text-slate-200 leading-relaxed font-medium relative z-10"><RenderText text={breakdown.opportunityFrame} report={report} /></p>
            </div>
    </div>
  );
}

function StakeholdersView({ section: sh, report }: { section: StakeholdersSection, report: ReportJSON }) {
  const influenceStyles: Record<string, string> = {
    high: "bg-red-50 text-red-700 border border-red-200 shadow-sm",
    medium: "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm",
    low: "bg-slate-100 text-slate-600 border border-slate-200 shadow-sm",
  };

  return (
    <div className="space-y-8">
            <p className="text-slate-700 text-[15px] leading-relaxed mb-8"><RenderText text={sh.overview} report={report} /></p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {sh.stakeholders.map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${s.influence === 'high' ? 'bg-purple-500' : s.influence === 'medium' ? 'bg-slate-400' : 'bg-slate-200'}`} />
                  <h4 className="font-bold text-slate-900 mb-1 pl-2"><RenderText text={s.name} report={report} /></h4>
                  <div className="text-xs font-semibold text-slate-500 mb-4 pl-2 bg-slate-50 inline-block px-2 py-1 rounded-md"><RenderText text={s.role} report={report} /></div>
                  
                  <div className="space-y-4 pl-2">
                    <div>
                      <strong className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Pain Points</strong>
                      <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                        {s.painPoints.map((pp, idx) => <li key={idx}><RenderText text={pp} report={report} /></li>)}
                      </ul>
                    </div>
                    <div>
                      <strong className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Success Criteria</strong>
                      <p className="text-sm text-slate-700"><RenderText text={s.successCriteria} report={report} /></p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                      <strong className="block text-xs text-purple-800 uppercase tracking-widest mb-1">Engagement Strategy</strong>
                      <p className="text-sm text-purple-900 font-medium"><RenderText text={s.engagementStrategy} report={report} /></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                  Power Dynamics
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed"><RenderText text={sh.powerDynamics} report={report} /></p>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Alignment Strategy
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed"><RenderText text={sh.alignmentStrategy} report={report} /></p>
              </div>
            </div>
    </div>
  );
}

function SolutionApproachView({ section: sol, report }: { section: SolutionApproachSection, report: ReportJSON }) {
  return (
    <div className="space-y-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Core Approach</h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm border border-amber-200">
                  <RenderText text={sol.strategicPosture} report={report} /> Posture
                </span>
              </div>
              <p className="text-slate-700 text-[15px] leading-relaxed"><RenderText text={sol.coreApproach} report={report} /></p>
            </div>

            <div className="mb-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Strategic Pillars</h3>
              {sol.pillars.map((pillar, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-base font-bold text-slate-800 mb-2"><RenderText text={pillar.title} report={report} /></h4>
                  <p className="text-sm text-slate-600 mb-3"><RenderText text={pillar.description} report={report} /></p>
                  <em className="text-xs text-slate-500 block mb-4 border-l-2 border-slate-200 pl-3 py-1 bg-slate-50">Rationale: <RenderText text={pillar.rationale} report={report} /></em>
                  
                  <div className="flex flex-wrap gap-2">
                    {pillar.keyActivities.map((act, idx) => (
                      <span key={idx} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                        <RenderText text={act} report={report} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Key Differentiators</h3>
                <ul className="space-y-2">
                  {sol.differentiators.map((diff, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500 mt-0.5 shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <RenderText text={diff} report={report} />
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Acknowledged Tradeoffs</h3>
                <div className="space-y-3">
                  {sol.tradeoffs.map((tradeoff, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                      <strong className="block text-slate-800 mb-1"><RenderText text={tradeoff.decision} report={report} /></strong>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium shadow-sm">Chose: <RenderText text={tradeoff.chose} report={report} /></span>
                        <span className="text-slate-400">→</span>
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 shadow-sm">Sacrificed: <RenderText text={tradeoff.tradeoff} report={report} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
    </div>
  );
}

function ActionPlanView({ section, report }: { section: ActionPlanSection, report: ReportJSON }) {
  return (
    <div className="space-y-8">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black tracking-widest uppercase text-emerald-800 mb-4 flex items-center gap-2">
          <span className="text-lg">⚡</span> Quick Wins (First 2 Weeks)
        </h3>
        <ul className="space-y-2">
          {section.quickWins.map((w, i) => (
            <li key={i} className="text-sm font-medium text-emerald-900 flex gap-3">
              <span className="font-bold text-emerald-600 bg-emerald-100 w-5 h-5 flex items-center justify-center rounded-full text-xs flex-shrink-0">{i + 1}</span>
              <span className="pt-0.5"><RenderText text={w} report={report} /></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-8">
        {section.phases.map((phase) => {
          const gradients = [
            "bg-blue-600 border-blue-700 text-white",
            "bg-indigo-600 border-indigo-700 text-white",
            "bg-violet-600 border-violet-700 text-white",
          ];
          const grad = gradients[(phase.phaseNumber - 1) % gradients.length];
          return (
            <div key={phase.phaseNumber} className="rounded-[24px] bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className={`${grad} px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-2`}>
                <h3 className="font-bold text-lg drop-shadow-sm">Phase {phase.phaseNumber}: <RenderText text={phase.phaseName} report={report} /></h3>
                <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm self-start"><RenderText text={phase.timeHorizon} report={report} /></span>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-slate-600 text-sm"><span className="font-bold text-slate-900">Objective: </span><RenderText text={phase.objective} report={report} /></p>

                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["Milestone", "Success Metric", "Owner", "Dependency"].map(h => (
                          <th key={h} className="text-slate-500 text-left px-5 py-3.5 font-bold text-[11px] uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {phase.milestones.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-slate-900"><RenderText text={m.title} report={report} /></td>
                          <td className="px-5 py-4 text-slate-600"><RenderText text={m.successMetric} report={report} /></td>
                          <td className="px-5 py-4 text-slate-500 font-medium"><RenderText text={m.owner} report={report} /></td>
                          <td className="px-5 py-4 text-slate-500"><RenderText text={m.dependency ?? "—"} report={report} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2"><span className="font-bold text-slate-700">Team: </span><span className="text-slate-600"><RenderText text={phase.resourceRequirements.team.join(", ")} report={report} /></span></div>
                  <div className="w-px h-4 bg-slate-300 hidden md:block" />
                  <div className="flex items-center gap-2"><span className="font-bold text-slate-700">Budget: </span><span className="text-slate-600"><RenderText text={phase.resourceRequirements.budget} report={report} /></span></div>
                </div>

                <div className="bg-purple-50 border-l-[6px] border-purple-500 rounded-r-xl px-6 py-4 shadow-sm">
                  <span className="text-[11px] font-black text-purple-800 uppercase tracking-widest">Phase Gate Approval: </span>
                  <span className="text-sm text-purple-900 font-medium block mt-1"><RenderText text={phase.phaseGate} report={report} /></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-sm font-black tracking-widest uppercase text-slate-800 mb-5">Critical Path Dependencies</h3>
        <ol className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200 pl-2">
          {section.criticalPath.map((c, i) => (
            <li key={i} className="text-sm font-medium text-slate-700 flex gap-4 relative">
              <span className="font-bold text-white bg-slate-800 w-6 h-6 flex items-center justify-center rounded-full text-[10px] flex-shrink-0 relative z-10 outline outline-4 outline-slate-50">{i + 1}</span>
              <span className="pt-0.5 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full"><RenderText text={c} report={report} /></span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

interface ReportSectionsProps {
  report: ReportJSON;
  onEdit: (sectionId: SectionId) => void;
}

// Render text with clickable Google Search metadata inline links [1], [2]
const RenderText = ({ text, report }: { text: string; report: ReportJSON }) => {
  if (!text) return null;
  
  // Clean up stray LLM tags like [cite: domain_output]
  const cleanedText = text.replace(/\[cite:\s*[^\]]+\]/g, "").trim();

  const references = report.metadata?.references || [];

  // Split text by [number] pattern to render links natively
  const parts = cleanedText.split(/(\[\d+\])/g);
  
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10) - 1;
          const ref = references[idx];
          if (ref) {
            return (
              <a 
                key={i} 
                href={ref.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                title={ref.title}
                className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-1 rounded-sm bg-blue-100 text-blue-700 text-[10px] font-bold pb-[1px] mx-1 hover:bg-blue-600 hover:text-white transition-colors align-text-bottom shadow-sm border border-blue-200 hover:border-blue-700"
              >
                {idx + 1}
              </a>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const SECTION_META: Record<SectionId, { badge: string; accentColor: string }> = {
  problemBreakdown: { badge: "01", accentColor: "border-l-orange-500" },
  stakeholders:     { badge: "02", accentColor: "border-l-indigo-500" },
  solutionApproach: { badge: "03", accentColor: "border-l-sky-500" },
  actionPlan:       { badge: "04", accentColor: "border-l-emerald-500" },
};

export function ReportSections({ report, onEdit }: ReportSectionsProps) {
  return (
    <div className="space-y-8">
      <SectionWrapper
        id="problemBreakdown"
        title={report.problemBreakdown.headline}
        {...SECTION_META.problemBreakdown}
        onEdit={onEdit}
      >
        <ProblemBreakdownView section={report.problemBreakdown} report={report} />
      </SectionWrapper>

      <SectionWrapper
        id="stakeholders"
        title={report.stakeholders.headline}
        {...SECTION_META.stakeholders}
        onEdit={onEdit}
      >
        <StakeholdersView section={report.stakeholders} report={report} />
      </SectionWrapper>

      <SectionWrapper
        id="solutionApproach"
        title={report.solutionApproach.headline}
        {...SECTION_META.solutionApproach}
        onEdit={onEdit}
      >
        <SolutionApproachView section={report.solutionApproach} report={report} />
      </SectionWrapper>

      <SectionWrapper
        id="actionPlan"
        title={report.actionPlan.headline}
        {...SECTION_META.actionPlan}
        onEdit={onEdit}
      >
        <ActionPlanView section={report.actionPlan} report={report} />
      </SectionWrapper>
    </div>
  );
}
