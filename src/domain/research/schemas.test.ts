import { describe, expect, it } from "vitest";
import {
  validateResearchExtraction,
  researchExtractionSchema,
} from "./schemas";

describe("research extraction schema", () => {
  const valid = {
    services: [
      {
        normalizedValue: "Botox",
        inventoryState: "CONFIRMED_PRESENT",
        confidence: "HIGH",
        evidence: [{ sourceUrl: "https://x.ca", sourceType: "mock", snippet: "Botox offered", confidence: "HIGH" }],
      },
    ],
    capabilities: [],
    brands: [],
    devices: [],
    practitioners: [],
    practitionerTypes: [],
    clinicalFocusAreas: [],
    notFoundCapabilities: [
      {
        capabilityTag: "THREAD_LIFTING",
        reviewedScope: "Reviewed services page; thread lifting not named.",
        confidence: "MEDIUM",
      },
    ],
    ambiguities: [],
    unknowns: [],
  };

  it("accepts valid extraction", () => {
    const r = validateResearchExtraction(valid);
    expect(r.ok).toBe(true);
  });

  it("rejects CONFIRMED_PRESENT without evidence", () => {
    const r = validateResearchExtraction({
      ...valid,
      services: [{ normalizedValue: "Peels", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH" }],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects product recommendation fields", () => {
    const r = validateResearchExtraction({ ...valid, productRecommendation: "Aptos" });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown capability tags", () => {
    const parsed = researchExtractionSchema.safeParse({
      ...valid,
      capabilities: [
        {
          normalizedValue: "foo",
          capabilityTag: "INVENTED_CAPABILITY",
          inventoryState: "CONFIRMED_PRESENT",
          confidence: "HIGH",
          evidence: [{ sourceUrl: null, sourceType: "mock", snippet: "x", confidence: "LOW" }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("distinguishes NOT_FOUND via notFoundCapabilities", () => {
    const r = validateResearchExtraction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.notFoundCapabilities[0]!.capabilityTag).toBe("THREAD_LIFTING");
    }
  });

  it("requires evidence for CONFIRMED_ABSENT", () => {
    const r = validateResearchExtraction({
      ...valid,
      services: [{ normalizedValue: "Threads", inventoryState: "CONFIRMED_ABSENT", confidence: "HIGH" }],
    });
    expect(r.ok).toBe(false);
  });
});
