/**
 * Clinic capability profile — structured research output (Stage C).
 * Extraction only; no product recommendations.
 */

import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";

export const RESEARCH_STATUSES = [
  "NOT_RESEARCHED",
  "RESEARCHING",
  "RESEARCHED",
  "NEEDS_VERIFICATION",
  "STALE",
  "FAILED",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const INVENTORY_STATES = [
  "CONFIRMED_PRESENT",
  "CONFIRMED_ABSENT",
  "NOT_FOUND",
  "AMBIGUOUS",
  "UNKNOWN",
] as const;

export type InventoryState = (typeof INVENTORY_STATES)[number];

export const EXTRACTION_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

export type ExtractionConfidence = (typeof EXTRACTION_CONFIDENCE_LEVELS)[number];

export type ProfileEvidenceRef = {
  id: string;
  sourceUrl: string | null;
  sourceType: "website" | "deterministic" | "mock";
  snippet: string;
  retrievedAt: string;
  confidence: ExtractionConfidence;
};

export type ProfileItemCategory =
  | "service"
  | "capability"
  | "brand"
  | "device"
  | "practitioner"
  | "practitioner_type"
  | "clinical_focus";

export type ProfileItem = {
  id: string;
  category: ProfileItemCategory;
  normalizedValue: string;
  rawSourceWording: string | null;
  capabilityTag: CapabilityTag | null;
  inventoryState: InventoryState;
  confidence: ExtractionConfidence;
  evidenceRefIds: string[];
  /** Pages reviewed when state is NOT_FOUND — never implies clinic-wide absence. */
  reviewedScope: string | null;
  fromDeterministicExtractor: boolean;
  conflictWithDeterministic: boolean;
};

export type ProfileAmbiguity = {
  topic: string;
  reason: string;
};

export type ReconciliationNote = {
  fieldPath: string;
  deterministicValue: string;
  researchValue: string | null;
  resolution: "keep_deterministic" | "research_adds_detail" | "conflict_visible";
  note: string;
};

export type ClinicCapabilityProfile = {
  clinicId: string;
  researchedAt: string;
  researchStatus: ResearchStatus;
  sourceVersion: string;
  provider: string;
  model: string | null;
  promptVersion: string;
  capabilityTaxonomyVersion: string;
  reviewedPageUrls: string[];
  services: ProfileItem[];
  capabilities: ProfileItem[];
  brands: ProfileItem[];
  devices: ProfileItem[];
  practitioners: ProfileItem[];
  practitionerTypes: ProfileItem[];
  clinicalFocusAreas: ProfileItem[];
  ambiguities: ProfileAmbiguity[];
  unknowns: string[];
  evidenceRefs: ProfileEvidenceRef[];
  reconciliationNotes: ReconciliationNote[];
};

export const CLINIC_RESEARCH_PROMPT_VERSION = "clinic-research-v1" as const;

/** Stage C must never emit product recommendations. */
export type ClinicCapabilityProfileMeta = {
  hasProductRecommendation: false;
};
