import { describe, expect, it } from "vitest";
import { MockLlmProvider, NoneLlmProvider } from "@/providers/llm/mockLlmProvider";
import {
  validateBriefNarrative,
  validateStructuredVisitNotes,
} from "@/domain/llm/validateSynthesis";
import { scanSafety } from "@/domain/llm/safety";
import {
  mergeBriefWithNarrative,
  synthesizeBriefNarrative,
  structureVisitNotesWithLlm,
  withTemplateFallback,
} from "@/domain/llm/synthesize";
import { generatePreVisitBrief } from "@/domain/brief";
import type { SynthesisContext } from "@/domain/llm/lockedFacts";
import { runProspectSearch } from "@/lib/prospecting";

const baseCredsCtx = {
  accountId: "mock-on-001",
  accountName: "Mock Yorkville Dermatology",
  segmentNumber: 1,
  categoryLabel: "Dermatology clinic, medical and/or cosmetic",
  organizationTypeLabel: "Independent",
  provinceCode: "ON",
  leadProduct: "APTOS" as const,
  openingAngle: "Thread angle",
  formerMesoesteticCustomer: false,
  aptosProductAllowed: true,
  serviceMenuSummary: "Injectables",
  skincareLines: "UNKNOWN, verify",
  practitionersSummary: "MD (medical director)",
  pricePositioning: "premium",
  googleReviewCount: 10,
  thinPublicData: false,
};

function makeCtx(overrides?: Partial<SynthesisContext["locked"]>): SynthesisContext {
  const template = generatePreVisitBrief({
    ctx: baseCredsCtx,
    visitDate: new Date("2026-08-31"),
    visitType: "first visit",
    lastVisitNotes: null,
  });
  return {
    locked: {
      accountId: "mock-on-001",
      accountName: "Mock Yorkville Dermatology",
      placeId: "mock-on-001",
      segmentNumber: 1,
      categoryNumber: 2,
      categoryLabel: "Dermatology clinic, medical and/or cosmetic",
      organizationTypeLabel: "Independent",
      provinceCode: "ON",
      fitScore: 5,
      leadProduct: "APTOS",
      leadProductLabel: "Aptos",
      certificationPathwayFit: "THREE_LEVEL",
      openingAngle: "Thread angle",
      isRevisit: false,
      doNotContact: false,
      formerMesoesteticCustomer: false,
      aptosProductAllowed: true,
      aptosCertificationLevel: null,
      hasAcademyAccount: null,
      crmMatchState: "EXACT",
      crmExternalId: "CRM-MOCK-001",
      lastOrderStatus: null,
      visitType: "first visit",
      seasonLabel: "Summer",
      seasonalPitchOrder: template.seasonalPitchOrder,
      provinceUvNote: "",
      ...overrides,
    },
    evidence: [
      {
        fieldPath: "threadsOffered",
        value: "PDO",
        sourceType: "website",
        sourceUrl: "https://example.fixture.local/",
        snippet: "PDO threads",
        verificationState: "VERIFIED_SOURCE",
      },
    ],
    knownPublic: {
      serviceMenuSummary: "Injectables",
      skincareLines: "UNKNOWN, verify",
      practitionersSummary: "MD",
      pricePositioning: "premium",
      enrichedThreads: "PDO",
      enrichedPrp: null,
      mesoesteticOnWebsite: false,
      thinPublicData: false,
    },
    lastVisitNotes: null,
    thinInputWarnings: [],
    templateBaseline: {
      snapshotThreeLines: template.snapshotThreeLines,
      leadProductWhy: template.leadProductWhy,
      secondProductIfFirstLands: template.secondProductIfFirstLands,
      openingLines: template.openingLines,
      fiveQuestions: template.fiveQuestions,
      signalsToReadOnSite: template.signalsToReadOnSite,
      objectionsAndResponses: template.objectionsAndResponses,
      theAsk: template.theAsk,
      leaveBehind: template.leaveBehind,
      doNotSay: template.doNotSay,
    },
  };
}

describe("LLM safety", () => {
  it("blocks guaranteed / permanent / Mesoestetic lead language", () => {
    expect(scanSafety("Results are guaranteed for every patient").length).toBeGreaterThan(0);
    expect(scanSafety("permanent results overnight").length).toBeGreaterThan(0);
    expect(scanSafety("Lead with Mesoestetic peels").some((f) => f.code === "MESOESTETIC_LEAD")).toBe(
      true,
    );
    expect(
      scanSafety("We promise future Mesoestetic supply to your clinic.").some(
        (f) => f.code === "MESOESTETIC_SUPPLY",
      ),
    ).toBe(true);
    // Compliance instructions mentioning forbidden words must not false-positive
    expect(
      scanSafety("Never use guaranteed/permanent/cures language in pitches.").length,
    ).toBe(0);
    expect(
      scanSafety(
        "Never promise or imply future Mesoestetic supply; Dermaceutic is the ongoing line.",
      ).length,
    ).toBe(0);
  });
});

describe("schema validation", () => {
  it("rejects unsafe narrative", () => {
    const ctx = makeCtx();
    const bad = {
      accountSummary: "Great clinic",
      snapshotThreeLines: ["a", "b", "c"],
      leadProductWhy: "Results are guaranteed for patients",
      secondProductIfFirstLands: "x",
      openingLines: { cold: "Hi", knowsNuvior: "Hi again", revisit: "Back" },
      fiveQuestions: ["1?", "2?", "3?", "4?", "5?"],
      signalsToReadOnSite: ["a", "b", "c", "d", "e"],
      objectionsAndResponses: [
        { objection: "o1", response: "r1" },
        { objection: "o2", response: "r2" },
        { objection: "o3", response: "r3" },
      ],
      theAsk: "ask",
      leaveBehind: "one-pager",
      doNotSay: ["a", "b"],
    };
    const v = validateBriefNarrative(bad, ctx.locked);
    expect(v.ok).toBe(false);
  });

  it("accepts mock synthesis and preserves locked lead on merge", async () => {
    const llm = new MockLlmProvider();
    const ctx = makeCtx();
    const synth = await synthesizeBriefNarrative(llm, ctx);
    expect(synth.ok).toBe(true);
    if (!synth.ok) return;
    const template = generatePreVisitBrief({
      ctx: baseCredsCtx,
      visitDate: new Date("2026-08-31"),
      visitType: "first visit",
      lastVisitNotes: null,
    });
    const merged = mergeBriefWithNarrative(template, synth, "Aptos");
    expect(merged.leadProductForVisit).toBe("Aptos");
    expect(merged.generator).toBe("llm");
    expect(merged.accountSummary).toBeTruthy();
  });

  it("falls back to template when LLM disabled", () => {
    const template = generatePreVisitBrief({
      ctx: baseCredsCtx,
      visitDate: new Date("2026-08-31"),
      visitType: "first visit",
      lastVisitNotes: null,
    });
    const fb = withTemplateFallback(template, "LLM disabled", "none");
    expect(fb.generator).toBe("llm_fallback");
    expect(fb.leadProductForVisit).toBe(template.leadProductForVisit);
  });
});

describe("visit note structuring", () => {
  it("structures freeform notes without inventing CRM writes", async () => {
    const llm = new MockLlmProvider();
    const r = await structureVisitNotesWithLlm(
      llm,
      "Met Dr Smith. Discussed Aptos and Dermaceutic. Interested. Follow up 2026-09-15 to book training.",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.productsDiscussed).toMatch(/Aptos/i);
    expect(validateStructuredVisitNotes(r.result).ok).toBe(true);
  });

  it("none provider fails closed", async () => {
    const r = await structureVisitNotesWithLlm(new NoneLlmProvider(), "notes");
    expect(r.ok).toBe(false);
  });
});

describe("prospecting LLM wiring", () => {
  it("keeps template briefs when LLM_PROVIDER=none", async () => {
    const prev = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "none";
    process.env.PLACES_PROVIDER = "mock";
    process.env.ENRICHMENT_ENABLED = "false";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 3,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    process.env.LLM_PROVIDER = prev;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.llm.provider).toBe("none");
    expect(result.llm.enabled).toBe(false);
    const brief = Object.values(result.briefByAccountId)[0];
    expect(brief?.generator).toBe("template");
  });

  it("synthesizes with mock LLM without changing locked lead product", async () => {
    const prev = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "mock";
    process.env.LLM_ENABLED_FOR_BRIEFS = "true";
    process.env.LLM_MAX_ACCOUNTS_PER_RUN = "3";
    process.env.PLACES_PROVIDER = "mock";
    process.env.ENRICHMENT_ENABLED = "false";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 3,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    process.env.LLM_PROVIDER = prev;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.llm.briefsSynthesized).toBeGreaterThan(0);
    for (const entry of result.result.entries) {
      const brief = result.briefByAccountId[entry.accountId]!;
      expect(brief.leadProductForVisit).toBe(entry.leadProductLabel);
      expect(["llm", "llm_fallback"]).toContain(brief.generator);
    }
  });
});
