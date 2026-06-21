import type { ReportSection, SectionConfig } from "@/types";

export function normalizeSectionData(
  config: SectionConfig,
  generated?: ReportSection
): ReportSection {
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    headline: generated?.headline?.trim() || config.title,
    blocks: generated?.blocks ?? [],
  };
}

export function orderSectionsForReport(
  sectionConfig: SectionConfig[],
  generated: ReportSection[]
): ReportSection[] {
  if (!sectionConfig || sectionConfig.length === 0) {
    return generated;
  }

  const byId = new Map(generated.map((s) => [s.id, s]));
  const byTitle = new Map(generated.map((s) => [s.title.toLowerCase(), s]));

  return sectionConfig.map((cfg) => {
    const match = byId.get(cfg.id) ?? byTitle.get(cfg.title.toLowerCase());
    return normalizeSectionData(cfg, match);
  });
}
