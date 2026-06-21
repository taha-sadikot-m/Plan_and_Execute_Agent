"use client";
// components/ReportSections.tsx
import { orderSectionsForReport } from "@/lib/sectionNormalize";
import type {
  ReportJSON,
  SectionId,
  ContentBlock,
  ReportSection,
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
          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500">
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{children}</p>
  );
}

const ACCENT_COLORS = [
  "border-l-orange-500",
  "border-l-indigo-500",
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-purple-500",
  "border-l-rose-500",
  "border-l-amber-500",
  "border-l-teal-500",
];

const RenderText = ({ text, report }: { text: string; report: ReportJSON }) => {
  if (!text) return null;

  const cleanedText = text.replace(/\[cite:\s*[^\]]+\]/g, "").trim();
  const references = report.metadata?.references || [];
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

function BlockRenderer({ block, report }: { block: ContentBlock; report: ReportJSON }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-slate-700 text-[15px] leading-relaxed">
          <RenderText text={block.content ?? ""} report={report} />
        </p>
      );

    case "subheading":
      return (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <RenderText text={block.title ?? block.content ?? ""} report={report} />
          </h3>
          {block.content && block.title && (
            <p className="text-slate-600 text-sm leading-relaxed ml-4">
              <RenderText text={block.content} report={report} />
            </p>
          )}
        </div>
      );

    case "bullets":
      return (
        <div>
          {block.title && (
            <Label>{block.title}</Label>
          )}
          <ul className="space-y-2">
            {(block.items ?? []).map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="text-slate-400 font-bold mt-0.5">•</span>
                <span><RenderText text={item} report={report} /></span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "numbered":
      return (
        <div>
          {block.title && (
            <Label>{block.title}</Label>
          )}
          <ol className="space-y-2">
            {(block.items ?? []).map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="font-bold text-slate-400 w-5 shrink-0">{i + 1}.</span>
                <span><RenderText text={item} report={report} /></span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "table":
      return (
        <div>
          {block.title && (
            <Label>{block.title}</Label>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                {(block.rows ?? []).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100 w-1/3">
                      <RenderText text={row.label} report={report} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 border-b border-slate-100">
                      <RenderText text={row.value} report={report} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "callout":
      return (
        <div className="bg-orange-50 border-l-[6px] border-orange-500 rounded-r-xl px-6 py-4 shadow-sm">
          {block.title && (
            <span className="text-[11px] font-black text-orange-800 uppercase tracking-widest block mb-1">
              <RenderText text={block.title} report={report} />
            </span>
          )}
          <p className="text-sm text-orange-900 font-medium">
            <RenderText text={block.content ?? ""} report={report} />
          </p>
        </div>
      );

    default:
      return null;
  }
}

function SectionContentView({ section, report }: { section: ReportSection; report: ReportJSON }) {
  if (!section.blocks || section.blocks.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        No content generated for this section.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {section.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} report={report} />
      ))}
    </div>
  );
}

interface ReportSectionsProps {
  report: ReportJSON;
  onEdit: (sectionId: SectionId) => void;
}

export function ReportSections({ report, onEdit }: ReportSectionsProps) {
  const orderedSections = orderSectionsForReport(
    report.metadata.sectionConfig,
    report.sections
  );

  return (
    <div className="space-y-8">
      {orderedSections.map((section, index) => (
        <SectionWrapper
          key={section.id}
          id={section.id}
          title={section.headline || section.title}
          badge={String(index + 1).padStart(2, "0")}
          accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
          onEdit={onEdit}
        >
          <SectionContentView section={section} report={report} />
        </SectionWrapper>
      ))}
    </div>
  );
}
