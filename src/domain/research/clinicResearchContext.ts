/**
 * Controlled input for clinic research — no secrets, no CRM payloads, no Odoo catalog.
 */

import { createHash } from "node:crypto";
import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { EvidenceRecord } from "@/domain/enrichment/types";

export type ResearchPageContent = {
  url: string;
  title: string | null;
  contentHash: string;
  cleanedText: string;
  retrievedAt: string;
};

export type ClinicResearchContext = {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl: string | null;
  pages: ResearchPageContent[];
  /** Field-level evidence from deterministic enrichment — read-only context. */
  deterministicEvidence: EvidenceRecord[];
  capabilityTaxonomy: readonly CapabilityTag[];
  capabilityTaxonomyVersion: string;
  /** Approved brand vocabulary from extractors — not inference permission. */
  approvedBrandVocabulary: readonly string[];
  promptVersion: string;
};

export function computeSourceVersion(pages: ResearchPageContent[], promptVersion: string): string {
  const payload = [
    promptVersion,
    ...pages.map((p) => `${p.url}:${p.contentHash}`).sort(),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
