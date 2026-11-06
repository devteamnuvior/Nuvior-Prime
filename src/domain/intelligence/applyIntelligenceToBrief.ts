/**
 * Apply Stage E intelligence to the pre-visit brief.
 */

import type { PreVisitBriefPayload } from "@/domain/brief";
import type { BriefIntelligenceSections, ClinicIntelligenceDto } from "./clinicIntelligenceDto";
import { buildBriefIntelligenceSections } from "./buildClinicIntelligenceDto";

export function applyIntelligenceToBrief(
  template: PreVisitBriefPayload,
  dto: ClinicIntelligenceDto,
  meta: { businessName: string },
): PreVisitBriefPayload {
  const sections = buildBriefIntelligenceSections(dto, meta.businessName);

  if (!sections.lockedFromOpportunityEngine || !sections.bestOpportunity) {
    return { ...template, clinicIntelligence: sections };
  }

  const thinWarnings = [...template.thinInputWarnings];
  if (sections.verifyQuestion && !thinWarnings.includes(sections.verifyQuestion)) {
    thinWarnings.unshift(sections.verifyQuestion);
  }
  for (const w of sections.watchOuts) {
    if (!thinWarnings.includes(w)) thinWarnings.push(w);
  }

  return {
    ...template,
    snapshotThreeLines: [
      sections.clinicSnapshot[0] ?? template.snapshotThreeLines[0],
      template.snapshotThreeLines[1],
      sections.clinicSnapshot[1] ?? template.snapshotThreeLines[2],
    ],
    thinInputWarnings: thinWarnings,
    clinicIntelligence: sections,
  };
}

export function intelligenceSectionsFromDto(
  dto: ClinicIntelligenceDto,
  meta: { businessName: string },
): BriefIntelligenceSections {
  return buildBriefIntelligenceSections(dto, meta.businessName);
}
