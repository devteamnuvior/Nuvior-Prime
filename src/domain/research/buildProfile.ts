/**
 * Build ClinicCapabilityProfile from validated extraction payload.
 */

import { createHash } from "node:crypto";
import { CAPABILITY_TAXONOMY_VERSION, isCapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type {
  ClinicCapabilityProfile,
  ProfileEvidenceRef,
  ProfileItem,
  ProfileItemCategory,
  ResearchStatus,
} from "./clinicCapabilityProfile";
import type { ClinicResearchContext } from "./clinicResearchContext";
import { computeSourceVersion } from "./clinicResearchContext";
import type { ResearchExtractionPayload } from "./schemas";
import type { ReconciliationNote } from "./clinicCapabilityProfile";

let evidenceCounter = 0;

function nextEvidenceId(): string {
  evidenceCounter += 1;
  return `ev-${evidenceCounter}`;
}

function resetEvidenceCounter(): void {
  evidenceCounter = 0;
}

function itemId(category: ProfileItemCategory, value: string): string {
  return createHash("sha256").update(`${category}:${value}`).digest("hex").slice(0, 12);
}

function mapItems(
  category: ProfileItemCategory,
  items: ResearchExtractionPayload["services"],
  evidenceRefs: ProfileEvidenceRef[],
  retrievedAt: string,
  opts?: { capabilityTagFromField?: boolean },
): ProfileItem[] {
  const out: ProfileItem[] = [];
  for (const row of items) {
    const refIds: string[] = [];
    if (row.evidence?.length) {
      for (const ev of row.evidence) {
        const id = nextEvidenceId();
        evidenceRefs.push({
          id,
          sourceUrl: ev.sourceUrl,
          sourceType: ev.sourceType === "mock" ? "mock" : "website",
          snippet: ev.snippet,
          retrievedAt,
          confidence: ev.confidence,
        });
        refIds.push(id);
      }
    }

    if (row.inventoryState === "CONFIRMED_PRESENT" && refIds.length === 0) continue;

    out.push({
      id: itemId(category, row.normalizedValue),
      category,
      normalizedValue: row.normalizedValue,
      rawSourceWording: row.rawSourceWording ?? null,
      capabilityTag:
        opts?.capabilityTagFromField && row.capabilityTag && isCapabilityTag(row.capabilityTag)
          ? row.capabilityTag
          : null,
      inventoryState: row.inventoryState,
      confidence: row.confidence,
      evidenceRefIds: refIds,
      reviewedScope: row.reviewedScope ?? null,
      fromDeterministicExtractor: false,
      conflictWithDeterministic: false,
    });
  }
  return out;
}

export function buildProfileFromExtraction(
  ctx: ClinicResearchContext,
  payload: ResearchExtractionPayload,
  meta: {
    provider: string;
    model: string | null;
    researchStatus: ResearchStatus;
    reconciliationNotes: ReconciliationNote[];
  },
): ClinicCapabilityProfile {
  resetEvidenceCounter();
  const evidenceRefs: ProfileEvidenceRef[] = [];
  const retrievedAt = new Date().toISOString();
  const sourceVersion = ctx.pages.length
    ? computeSourceVersion(ctx.pages, ctx.promptVersion)
    : "no-pages";

  const capabilities = mapItems("capability", payload.capabilities, evidenceRefs, retrievedAt, {
    capabilityTagFromField: true,
  });

  for (const nf of payload.notFoundCapabilities) {
    capabilities.push({
      id: itemId("capability", `not-found-${nf.capabilityTag}`),
      category: "capability",
      normalizedValue: nf.capabilityTag,
      rawSourceWording: null,
      capabilityTag: isCapabilityTag(nf.capabilityTag) ? nf.capabilityTag : null,
      inventoryState: "NOT_FOUND",
      confidence: nf.confidence,
      evidenceRefIds: [],
      reviewedScope: nf.reviewedScope,
      fromDeterministicExtractor: false,
      conflictWithDeterministic: false,
    });
  }

  return {
    clinicId: ctx.clinicId,
    researchedAt: retrievedAt,
    researchStatus: meta.researchStatus,
    sourceVersion,
    provider: meta.provider,
    model: meta.model,
    promptVersion: ctx.promptVersion,
    capabilityTaxonomyVersion: CAPABILITY_TAXONOMY_VERSION,
    reviewedPageUrls: ctx.pages.map((p) => p.url),
    services: mapItems("service", payload.services, evidenceRefs, retrievedAt),
    capabilities,
    brands: mapItems("brand", payload.brands, evidenceRefs, retrievedAt),
    devices: mapItems("device", payload.devices, evidenceRefs, retrievedAt),
    practitioners: mapItems("practitioner", payload.practitioners, evidenceRefs, retrievedAt),
    practitionerTypes: mapItems(
      "practitioner_type",
      payload.practitionerTypes,
      evidenceRefs,
      retrievedAt,
    ),
    clinicalFocusAreas: mapItems(
      "clinical_focus",
      payload.clinicalFocusAreas,
      evidenceRefs,
      retrievedAt,
    ),
    ambiguities: payload.ambiguities,
    unknowns: payload.unknowns,
    evidenceRefs,
    reconciliationNotes: meta.reconciliationNotes,
  };
}