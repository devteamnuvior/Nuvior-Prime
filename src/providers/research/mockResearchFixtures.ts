/**
 * Deterministic mock research fixtures for Stage C / future Stage D–E tests.
 */

import type { ResearchExtractionPayload } from "@/domain/research/schemas";

const E = (snippet: string, url = "https://example-clinic.ca/services") => ({
  sourceUrl: url,
  sourceType: "mock" as const,
  snippet,
  confidence: "HIGH" as const,
});

export const MOCK_RESEARCH_FIXTURE_IDS = [
  "fixture-injectable-clinic",
  "fixture-skincare-brands",
  "fixture-prp-clinic",
  "fixture-threads-clinic",
  "fixture-aesthetician-only",
  "fixture-sparse-website",
  "fixture-conflicting-language",
  "fixture-explicit-absence",
  "fixture-no-information",
  "fixture-spa-retail",
] as const;

export type MockResearchFixtureId = (typeof MOCK_RESEARCH_FIXTURE_IDS)[number];

export const MOCK_RESEARCH_FIXTURES: Record<MockResearchFixtureId, ResearchExtractionPayload> = {
  "fixture-injectable-clinic": {
    services: [
      {
        normalizedValue: "Botox",
        rawSourceWording: "Botox Cosmetic injections",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Our clinic offers Botox Cosmetic for wrinkle reduction.")],
      },
      {
        normalizedValue: "Dermal fillers",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Juvederm and Restylane dermal fillers available.")],
      },
    ],
    capabilities: [],
    brands: [
      {
        normalizedValue: "Juvederm",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Juvederm dermal fillers")],
      },
    ],
    devices: [],
    practitioners: [
      {
        normalizedValue: "Dr. Jane Smith, MD",
        rawSourceWording: "Medical Director Dr. Jane Smith, MD",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Medical Director Dr. Jane Smith, MD")],
      },
    ],
    practitionerTypes: [
      {
        normalizedValue: "MD",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Dr. Jane Smith, MD")],
      },
    ],
    clinicalFocusAreas: [
      {
        normalizedValue: "Facial aesthetics",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "MEDIUM",
        evidence: [E("Physician-led facial aesthetics clinic")],
      },
    ],
    notFoundCapabilities: [
      {
        capabilityTag: "THREAD_LIFTING",
        reviewedScope: "Reviewed homepage and injectables/services pages; no thread-lifting service named.",
        confidence: "MEDIUM",
      },
    ],
    ambiguities: [],
    unknowns: [],
  },

  "fixture-skincare-brands": {
    services: [
      {
        normalizedValue: "Chemical peels",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Professional chemical peel treatments")],
      },
    ],
    capabilities: [
      {
        normalizedValue: "Professional peel",
        capabilityTag: "PROFESSIONAL_PEEL",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Professional chemical peel treatments")],
      },
      {
        normalizedValue: "Medical-grade skincare",
        capabilityTag: "MEDICAL_GRADE_SKINCARE",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Medical-grade skincare retail boutique")],
      },
    ],
    brands: [
      {
        normalizedValue: "SkinCeuticals",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("We carry SkinCeuticals in-clinic.")],
      },
      {
        normalizedValue: "ZO Skin Health",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("ZO Skin Health protocols")],
      },
    ],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: [],
  },

  "fixture-prp-clinic": {
    services: [
      {
        normalizedValue: "PRP hair restoration",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("PRP hair restoration treatments")],
      },
    ],
    capabilities: [
      {
        normalizedValue: "PRP hair",
        capabilityTag: "PRP_HAIR",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("PRP hair restoration")],
      },
    ],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [{ normalizedValue: "MD", inventoryState: "CONFIRMED_PRESENT", confidence: "MEDIUM", evidence: [E("Sports medicine physician")] }],
    clinicalFocusAreas: [{ normalizedValue: "Hair restoration", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [E("PRP hair restoration clinic")] }],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: [],
  },

  "fixture-threads-clinic": {
    services: [{ normalizedValue: "PDO thread lift", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [E("PDO thread lift procedures")] }],
    capabilities: [{ normalizedValue: "Thread lifting", capabilityTag: "THREAD_LIFTING", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [E("PDO thread lift")] }],
    brands: [{ normalizedValue: "PDO", inventoryState: "CONFIRMED_PRESENT", confidence: "MEDIUM", evidence: [E("PDO thread lift")] }],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: [],
  },

  "fixture-aesthetician-only": {
    services: [{ normalizedValue: "Facials", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [E("Licensed aesthetician facials")] }],
    capabilities: [{ normalizedValue: "Medical-grade skincare", capabilityTag: "MEDICAL_GRADE_SKINCARE", inventoryState: "AMBIGUOUS", confidence: "LOW", evidence: [E("Skincare studio — no injectables listed")] }],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [{ normalizedValue: "Aesthetician", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [E("Licensed aesthetician")] }],
    clinicalFocusAreas: [],
    notFoundCapabilities: [
      { capabilityTag: "THREAD_LIFTING", reviewedScope: "Reviewed services page; no injectables or threads.", confidence: "MEDIUM" },
    ],
    ambiguities: [{ topic: "Injectables", reason: "No injectable services mentioned; spa positioning only." }],
    unknowns: ["Injection scope not assessable from public pages"],
  },

  "fixture-sparse-website": {
    services: [],
    capabilities: [],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: ["Website contained only contact information — insufficient service detail"],
  },

  "fixture-conflicting-language": {
    services: [
      { normalizedValue: "Thread lift", inventoryState: "AMBIGUOUS", confidence: "LOW", evidence: [E("Coming soon: thread lift consultations")] },
    ],
    capabilities: [],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [{ topic: "Thread lifting", reason: "Coming-soon language — not confirmed as currently offered." }],
    unknowns: [],
  },

  "fixture-explicit-absence": {
    services: [
      {
        normalizedValue: "Thread lifting",
        inventoryState: "CONFIRMED_ABSENT",
        confidence: "HIGH",
        evidence: [E("We do not offer thread lifting at this clinic.")],
      },
    ],
    capabilities: [
      {
        normalizedValue: "Thread lifting",
        capabilityTag: "THREAD_LIFTING",
        inventoryState: "CONFIRMED_ABSENT",
        confidence: "HIGH",
        evidence: [E("We do not offer thread lifting at this clinic.")],
      },
    ],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: [],
  },

  "fixture-no-information": {
    services: [],
    capabilities: [],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [],
    ambiguities: [],
    unknowns: ["Research could not extract meaningful public capability signals"],
  },

  "fixture-spa-retail": {
    services: [
      {
        normalizedValue: "Spa retail boutique",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Skincare boutique and spa retail gifts")],
      },
      {
        normalizedValue: "Corrective facials",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "MEDIUM",
        evidence: [E("Corrective facial treatments")],
      },
    ],
    capabilities: [
      {
        normalizedValue: "Medical-grade skincare",
        capabilityTag: "MEDICAL_GRADE_SKINCARE",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "MEDIUM",
        evidence: [E("Medical-grade skincare retail")],
      },
    ],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [
      {
        normalizedValue: "Spa wellness retail",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [E("Spa wellness retail environment")],
      },
    ],
    notFoundCapabilities: [
      {
        capabilityTag: "RETAIL_BEAUTY_DEVICE",
        reviewedScope: "Reviewed retail and spa pages; no at-home beauty device lines named.",
        confidence: "MEDIUM",
      },
    ],
    ambiguities: [],
    unknowns: [],
  },
};

export function resolveMockFixture(clinicId: string): ResearchExtractionPayload {
  if (clinicId in MOCK_RESEARCH_FIXTURES) {
    return MOCK_RESEARCH_FIXTURES[clinicId as MockResearchFixtureId];
  }
  return MOCK_RESEARCH_FIXTURES["fixture-injectable-clinic"];
}
