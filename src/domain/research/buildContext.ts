/**
 * Build controlled ClinicResearchContext from enrichment + pages.
 */

import { createHash } from "node:crypto";
import { CAPABILITY_TAGS, CAPABILITY_TAXONOMY_VERSION } from "@/domain/products/capabilityTaxonomy";
import type { EnrichmentResult } from "@/domain/enrichment/types";
import {
  SKINCARE_BRANDS,
  FILLER_TOXIN_BRANDS,
  THREAD_BRANDS,
  DEVICE_NAMES,
} from "@/domain/enrichment/extractors";
import {
  CLINIC_RESEARCH_PROMPT_VERSION,
} from "./clinicCapabilityProfile";
import type { ClinicResearchContext, ResearchPageContent } from "./clinicResearchContext";
import { sanitizeWebsiteText } from "./sanitize";

export type BuildResearchContextInput = {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl: string | null;
  enrichment?: EnrichmentResult | null;
  /** Raw page text from website cache or enrichment fetch. */
  rawPages?: { url: string; title: string | null; bodyText: string; retrievedAt: string }[];
};

export function buildResearchContext(input: BuildResearchContextInput): ClinicResearchContext {
  const pages: ResearchPageContent[] = (input.rawPages ?? []).map((p) => {
    const cleanedText = sanitizeWebsiteText(p.bodyText);
    const contentHash = createHash("sha256").update(cleanedText).digest("hex").slice(0, 16);
    return {
      url: p.url,
      title: p.title,
      contentHash,
      cleanedText,
      retrievedAt: p.retrievedAt,
    };
  });

  const deterministicEvidence = input.enrichment?.evidence ?? [];

  return {
    clinicId: input.clinicId,
    businessName: input.businessName,
    provinceCode: input.provinceCode,
    segmentNumber: input.segmentNumber,
    categoryLabel: input.categoryLabel,
    websiteUrl: input.websiteUrl,
    pages,
    deterministicEvidence,
    capabilityTaxonomy: CAPABILITY_TAGS,
    capabilityTaxonomyVersion: CAPABILITY_TAXONOMY_VERSION,
    approvedBrandVocabulary: [
      ...SKINCARE_BRANDS,
      ...FILLER_TOXIN_BRANDS,
      ...THREAD_BRANDS,
      ...DEVICE_NAMES,
    ],
    promptVersion: CLINIC_RESEARCH_PROMPT_VERSION,
  };
}
