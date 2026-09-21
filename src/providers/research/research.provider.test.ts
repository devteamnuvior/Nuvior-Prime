import { afterEach, describe, expect, it, vi } from "vitest";
import { MockResearchProvider } from "./mockResearchProvider";
import { ClaudeResearchProvider } from "./claudeResearchProvider";
import { DisabledResearchProvider } from "./disabledResearchProvider";
import { getResearchProvider, resetResearchProviderForTests } from "./index";
import { buildResearchContext } from "@/domain/research/buildContext";

const baseCtx = () =>
  buildResearchContext({
    clinicId: "fixture-injectable-clinic",
    businessName: "Test",
    provinceCode: "ON",
    segmentNumber: 1,
    categoryLabel: "Medical aesthetics",
    websiteUrl: "https://example.ca",
    rawPages: [],
  });

describe("ResearchProvider — mock", () => {
  it("extracts fixture payload", async () => {
    const r = await new MockResearchProvider().extract(baseCtx());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.services.length).toBeGreaterThan(0);
  });

  it("fails when unavailable", async () => {
    const p = new MockResearchProvider({ unavailable: true });
    const r = await p.extract(baseCtx());
    expect(r.ok).toBe(false);
  });
});

describe("ResearchProvider — claude", () => {
  it("is disabled without API key", () => {
    const p = new ClaudeResearchProvider({ apiKey: "" });
    expect(p.isEnabled()).toBe(false);
    expect(p.getUnavailableReason()).toMatch(/ANTHROPIC_API_KEY/);
  });
});

describe("ResearchProvider — factory", () => {
  afterEach(() => {
    resetResearchProviderForTests();
    vi.unstubAllEnvs();
  });

  it("defaults to mock", () => {
    vi.stubEnv("AI_RESEARCH_PROVIDER", "mock");
    expect(getResearchProvider().name).toBe("mock");
  });

  it("does not fall back when claude unconfigured", () => {
    vi.stubEnv("AI_RESEARCH_PROVIDER", "claude");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const p = getResearchProvider();
    expect(p.name).toBe("claude");
    expect(p.isEnabled()).toBe(false);
  });

  it("uses disabled mode", () => {
    vi.stubEnv("AI_RESEARCH_PROVIDER", "disabled");
    expect(getResearchProvider().isEnabled()).toBe(false);
  });
});

describe("DisabledResearchProvider", () => {
  it("returns error on extract", async () => {
    const r = await new DisabledResearchProvider().extract(baseCtx());
    expect(r.ok).toBe(false);
  });
});

describe("no product recommendation in provider output", () => {
  it("mock payload has no recommendation keys", async () => {
    const r = await new MockResearchProvider().extract(baseCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(JSON.stringify(r.payload)).not.toMatch(/recommend|nuviorProduct|opportunityScore/i);
    }
  });
});
