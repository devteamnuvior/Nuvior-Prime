/**
 * Phase 3 enrichment tests — mocked HTTP only.
 */

import { describe, expect, it } from "vitest";
import {
  extractPeople,
  extractServices,
  extractBrands,
  extractEmails,
  htmlToText,
} from "@/domain/enrichment/extractors";
import { aggregateEvidence, dedupeEvidence } from "@/domain/enrichment/aggregateEvidence";
import { selectPagesToFetch } from "@/domain/enrichment/pageSelection";
import {
  WebsiteEnrichmentProvider,
  FixtureEnrichmentProvider,
} from "@/providers/enrichment/websiteEnrichmentProvider";
import type { PageFetcher } from "@/providers/enrichment/fetchPage";
import type { EvidenceRecord } from "@/domain/enrichment/types";
import { signalsFromEnrichment } from "@/domain/enrichment/qualificationSignals";
import { qualifyAccount } from "@/domain/qualification";
import { runProspectSearch } from "@/lib/prospecting";
import { MOCK_WEBSITE_HTML } from "@/providers/enrichment/mockWebsiteFixtures";

const sampleHtml = `<!DOCTYPE html><html><head><title>Demo Clinic</title></head><body>
<a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact</a>
<a href="https://instagram.com/democlinic">IG</a>
<a href="/book-now">Book</a>
<p>Contact info@democlinic.example</p>
<p>Jane Smith, MD — Medical Director</p>
<p>We offer Botox, chemical peels, PDO threads, SkinCeuticals, and Morpheus8.</p>
</body></html>`;

describe("page selection", () => {
  it("prefers about/services/contact and caps pages", () => {
    const pages = selectPagesToFetch("https://democlinic.example", sampleHtml, 4);
    expect(pages[0]?.kind).toBe("home");
    expect(pages.length).toBeLessThanOrEqual(4);
    expect(pages.some((p) => p.kind === "about" || p.kind === "services")).toBe(true);
  });
});

describe("deterministic extractors", () => {
  it("extracts credentials only when explicitly stated", () => {
    const text = htmlToText(sampleHtml);
    const people = extractPeople(text, "https://democlinic.example", "Demo");
    expect(people.some((p) => p.credentials === "MD" && /Jane Smith/i.test(p.name))).toBe(true);
  });

  it("extracts services and does not treat generic lift as threads", () => {
    const thread = extractServices(
      "We offer PDO thread lift treatments",
      "https://x.example",
      null,
    );
    expect(thread.some((e) => e.fieldPath === "advertisesThreadLifting")).toBe(true);

    const ambiguous = extractServices("Jawline lift and facelift consults", "https://x.example", null);
    expect(ambiguous.some((e) => e.verificationState === "AMBIGUOUS")).toBe(true);
    expect(ambiguous.some((e) => e.fieldPath === "advertisesThreadLifting")).toBe(false);
  });

  it("extracts brands including Mesoestetic as signal only", () => {
    const brands = extractBrands("We stock Mesoestetic and Cosmelan", "https://x.example", null);
    expect(brands.some((e) => e.fieldPath === "mesoesteticMentioned")).toBe(true);
    expect(brands.some((e) => e.fieldPath === "skincareLines")).toBe(true);
  });

  it("extracts email", () => {
    const emails = extractEmails(htmlToText(sampleHtml), "https://democlinic.example", null);
    expect(emails[0]?.value).toBe("info@democlinic.example");
  });
});

describe("evidence aggregation", () => {
  it("flags conflicting values", () => {
    const records: EvidenceRecord[] = [
      {
        fieldPath: "generalEmail",
        value: "a@clinic.example",
        sourceType: "website",
        sourceUrl: "https://a",
        sourceTitle: null,
        snippet: "a@",
        retrievedAt: new Date().toISOString(),
        confidence: "high",
        verificationState: "VERIFIED_SOURCE",
      },
      {
        fieldPath: "generalEmail",
        value: "b@clinic.example",
        sourceType: "website",
        sourceUrl: "https://b",
        sourceTitle: null,
        snippet: "b@",
        retrievedAt: new Date().toISOString(),
        confidence: "high",
        verificationState: "VERIFIED_SOURCE",
      },
    ];
    const { resolved, verificationItems } = aggregateEvidence("id", "Clinic", records);
    expect(resolved[0]?.conflict).toBe(true);
    expect(resolved[0]?.value).toContain("CONFLICT, verify");
    expect(verificationItems[0]?.status).toBe("CONFLICT");
  });

  it("dedupes identical evidence", () => {
    const r: EvidenceRecord = {
      fieldPath: "skincareLines",
      value: "Obagi",
      sourceType: "website",
      sourceUrl: "https://x",
      sourceTitle: null,
      snippet: "Obagi",
      retrievedAt: new Date().toISOString(),
      confidence: "high",
      verificationState: "VERIFIED_SOURCE",
    };
    expect(dedupeEvidence([r, { ...r }])).toHaveLength(1);
  });
});

describe("website enrichment provider", () => {
  it("enriches from mocked HTTP and handles fetch failure gracefully", async () => {
    const okFetcher: PageFetcher = async (url) => ({
      url,
      statusCode: 200,
      bodyText: sampleHtml,
      html: sampleHtml,
      sourceTitle: "Demo Clinic",
      cacheHit: false,
    });
    const provider = new WebsiteEnrichmentProvider(okFetcher);
    const budget = {
      maxPagesPerAccount: 3,
      maxRequestsRemaining: { value: 10 },
      timeoutMs: 1000,
      maxBytes: 100_000,
      cacheTtlSeconds: 60,
    };
    const result = await provider.enrich(
      {
        accountId: "t1",
        businessName: "Demo Clinic",
        website: "https://democlinic.example",
      },
      budget,
    );
    expect(result.skipped).toBe(false);
    expect(result.facts.people.length).toBeGreaterThan(0);
    expect(result.facts.advertisesThreadLifting).toBe(true);
    expect(result.evidence.every((e) => e.sourceType === "website" || e.fieldPath)).toBe(true);

    const failFetcher: PageFetcher = async (url) => ({
      url,
      statusCode: 0,
      bodyText: "",
      html: "",
      sourceTitle: null,
      cacheHit: false,
      error: "timeout",
    });
    const failed = await new WebsiteEnrichmentProvider(failFetcher).enrich(
      { accountId: "t2", businessName: "X", website: "https://x.example" },
      { ...budget, maxRequestsRemaining: { value: 5 } },
    );
    expect(failed.skipped).toBe(true);
    expect(failed.skipReason).toBe("timeout");
  });

  it("skips accounts without website", async () => {
    const provider = new WebsiteEnrichmentProvider();
    const result = await provider.enrich(
      { accountId: "n", businessName: "No Web", website: null },
      {
        maxPagesPerAccount: 2,
        maxRequestsRemaining: { value: 5 },
        timeoutMs: 1000,
        maxBytes: 1000,
        cacheTtlSeconds: 60,
      },
    );
    expect(result.skipped).toBe(true);
  });
});

describe("fixture enrichment + qualification", () => {
  it("feeds explicit MD/thread signals into qualification without Mesoestetic lead", async () => {
    const provider = new FixtureEnrichmentProvider(MOCK_WEBSITE_HTML);
    const enriched = await provider.enrich(
      {
        accountId: "mock-on-001",
        businessName: "Mock Yorkville Dermatology",
        website: "https://mock-on-001.fixture.local/",
      },
      {
        maxPagesPerAccount: 2,
        maxRequestsRemaining: { value: 10 },
        timeoutMs: 1000,
        maxBytes: 200_000,
        cacheTtlSeconds: 60,
      },
    );
    const signals = signalsFromEnrichment(enriched);
    expect(signals.credentials.hasPhysicianOrNp).toBe(true);
    expect(signals.advertisesThreadLifting).toBe(true);

    const q = qualifyAccount({
      businessName: "Mock Yorkville Dermatology",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryNumber: 2,
      categoryLabel: "Dermatology clinic, medical and/or cosmetic",
      organizationTypeLabel: "Independent",
      credentials: {
        hasPhysicianOrNp: true,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: true,
        rnHasPhysicianDirective: false,
      },
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: signals.injectablesOffered ?? "yes",
      threadsOffered: signals.threadsOffered ?? "PDO",
      skincareLines: signals.skincareLines ?? "SkinCeuticals",
    });
    expect(q.recommendedLeadProductLabel).not.toMatch(/Mesoestetic/i);
  });

  it("Mesoestetic on website does not become lead product", async () => {
    const provider = new FixtureEnrichmentProvider(MOCK_WEBSITE_HTML);
    const enriched = await provider.enrich(
      {
        accountId: "mock-on-007",
        businessName: "Pigment Lab",
        website: "https://mock-on-007.fixture.local/",
      },
      {
        maxPagesPerAccount: 2,
        maxRequestsRemaining: { value: 10 },
        timeoutMs: 1000,
        maxBytes: 200_000,
        cacheTtlSeconds: 60,
      },
    );
    expect(enriched.facts.mesoesteticMentioned).toBe(true);
    const q = qualifyAccount({
      businessName: "Pigment Lab",
      provinceCode: "ON",
      segmentNumber: 4,
      categoryNumber: 3,
      categoryLabel: "Pigmentation & melasma specialist clinic",
      organizationTypeLabel: "Independent",
      credentials: {
        hasPhysicianOrNp: false,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: false,
        rnHasPhysicianDirective: false,
      },
      advertisesThreadLifting: false,
      pricePositioning: "mid",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: "no",
      threadsOffered: "none",
      skincareLines: enriched.facts.skincareLines ?? "UNKNOWN, verify",
    });
    expect(q.recommendedLeadProduct).toBe("DERMACEUTIC");
  });
});

describe("end-to-end with enrichment fixtures", () => {
  it("runs mock Toronto search with enrichment and verification queue", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ENRICHMENT_ENABLED = "true";
    process.env.ENRICHMENT_MAX_ACCOUNTS = "5";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 20,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enrichment.enabled).toBe(true);
    expect(result.enrichment.accountsAttempted).toBeGreaterThan(0);
    expect(result.verificationQueue.length).toBeGreaterThan(0);
    expect(result.result.entries.every((e) => e.leadProductLabel !== "Mesoestetic")).toBe(true);
  });
});
