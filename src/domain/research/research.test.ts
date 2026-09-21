import { describe, expect, it } from "vitest";
import { buildResearchContext } from "./buildContext";
import { runClinicResearch } from "./runResearch";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { MOCK_RESEARCH_FIXTURE_IDS } from "@/providers/research/mockResearchFixtures";
import { reconcileWithDeterministicEvidence } from "./reconcile";
import type { EvidenceRecord } from "@/domain/enrichment/types";

describe("clinic research workflow", () => {
  it("builds controlled context without CRM secrets", () => {
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "Test Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Medical aesthetics",
      websiteUrl: "https://example.ca",
      rawPages: [
        {
          url: "https://example.ca/services",
          title: "Services",
          bodyText: "Botox and fillers",
          retrievedAt: new Date().toISOString(),
        },
      ],
    });
    expect(ctx.capabilityTaxonomy.length).toBeGreaterThan(0);
    expect(ctx.approvedBrandVocabulary).toContain("SkinCeuticals");
    expect(JSON.stringify(ctx)).not.toMatch(/ANTHROPIC_API_KEY/);
  });

  it("runs mock research for injectable fixture", async () => {
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "Injectable Demo",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Medical aesthetics",
      websiteUrl: "https://example.ca",
      rawPages: [],
    });
    const result = await runClinicResearch(new MockResearchProvider(), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.services.some((s) => s.normalizedValue.includes("Botox"))).toBe(true);
      expect(result.profile.capabilities.some((c) => c.inventoryState === "NOT_FOUND")).toBe(true);
      expect(result.profile.evidenceRefs.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.profile)).not.toMatch(/nuviorProductId|productRecommendation/i);
    }
  });

  it("uses NOT_FOUND semantics with reviewedScope", async () => {
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "Demo",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Medical aesthetics",
      websiteUrl: null,
      rawPages: [],
    });
    const result = await runClinicResearch(new MockResearchProvider(), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const nf = result.profile.capabilities.find((c) => c.inventoryState === "NOT_FOUND");
      expect(nf?.reviewedScope).toMatch(/Reviewed/i);
      expect(nf?.evidenceRefIds).toHaveLength(0);
    }
  });

  it("preserves deterministic/research conflicts", () => {
    const det: EvidenceRecord = {
      fieldPath: "threadsOffered",
      value: "PDO threads advertised",
      sourceType: "website",
      sourceUrl: "https://x.ca",
      sourceTitle: null,
      snippet: "PDO threads",
      retrievedAt: new Date().toISOString(),
      confidence: "high",
      verificationState: "VERIFIED_SOURCE",
    };
    const { notes } = reconcileWithDeterministicEvidence(
      {
        services: [{ normalizedValue: "No threads", inventoryState: "CONFIRMED_PRESENT", confidence: "HIGH", evidence: [{ sourceUrl: "https://x.ca", sourceType: "mock", snippet: "No threads", confidence: "HIGH" }] }],
        capabilities: [],
        brands: [],
        devices: [],
        practitioners: [],
        practitionerTypes: [],
        clinicalFocusAreas: [],
        notFoundCapabilities: [],
        ambiguities: [],
        unknowns: [],
      },
      [det],
    );
    expect(notes.some((n) => n.resolution === "conflict_visible" || n.resolution === "research_adds_detail")).toBe(true);
  });

  it("covers all mock fixture ids", async () => {
    for (const id of MOCK_RESEARCH_FIXTURE_IDS) {
      const ctx = buildResearchContext({
        clinicId: id,
        businessName: id,
        provinceCode: "ON",
        segmentNumber: 1,
        categoryLabel: "Test",
        websiteUrl: null,
        rawPages: [],
      });
      const result = await runClinicResearch(new MockResearchProvider(), ctx);
      expect(result.ok).toBe(true);
    }
  });
});
