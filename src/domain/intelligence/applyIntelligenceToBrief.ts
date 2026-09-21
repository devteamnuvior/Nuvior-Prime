/**
 * Apply Stage E intelligence to pre-visit brief — primary product locked.
 */

import type { PreVisitBriefPayload } from "@/domain/brief";
import type { BriefIntelligenceSections, ClinicIntelligenceDto } from "./clinicIntelligenceDto";
import { buildBriefIntelligenceSections } from "./buildClinicIntelligenceDto";

export function applyIntelligenceToBrief(
  template: PreVisitBriefPayload,
  dto: ClinicIntelligenceDto,
  meta: { businessName: string; categoryLabel: string; segmentNumber: number },
): PreVisitBriefPayload {
  const sections = buildBriefIntelligenceSections(
    dto,
    meta.businessName,
    meta.categoryLabel,
    meta.segmentNumber,
  );

  if (!sections.lockedFromOpportunityEngine || !sections.bestOpportunity) {
    return { ...template, clinicIntelligence: sections };
  }

  const lockedProduct = sections.bestOpportunity.productName;
  const why =
    sections.whyReasons.length > 0
      ? sections.whyReasons.join("; ")
      : template.leadProductWhy;

  const thinWarnings = [...template.thinInputWarnings];
  if (sections.verifyQuestion && !thinWarnings.includes(sections.verifyQuestion)) {
    thinWarnings.unshift(sections.verifyQuestion);
  }
  for (const w of sections.watchOuts) {
    if (!thinWarnings.includes(w)) thinWarnings.push(w);
  }

  return {
    ...template,
    leadProductForVisit: lockedProduct,
    leadProductWhy: why,
    snapshotThreeLines: [
      sections.clinicSnapshot[0] ?? template.snapshotThreeLines[0],
      sections.accountFitLine ?? template.snapshotThreeLines[1],
      sections.clinicSnapshot[1] ?? template.snapshotThreeLines[2],
    ],
    thinInputWarnings: thinWarnings,
    clinicIntelligence: sections,
  };
}

export function intelligenceSectionsFromDto(
  dto: ClinicIntelligenceDto,
  meta: { businessName: string; categoryLabel: string; segmentNumber: number },
): BriefIntelligenceSections {
  return buildBriefIntelligenceSections(
    dto,
    meta.businessName,
    meta.categoryLabel,
    meta.segmentNumber,
  );
}
