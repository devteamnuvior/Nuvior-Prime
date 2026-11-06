import { afterEach, describe, expect, it, vi } from "vitest";
import { MockClinicProfileProvider } from "./mockClinicProfileProvider";
import { ClaudeClinicProfileProvider } from "./claudeClinicProfileProvider";
import { getClinicProfileProvider, resetClinicProfileProviderForTests } from "./index";
import { extractJsonObject, validateClinicWebProfile } from "@/domain/clinicProfile/schema";
import type { ClinicProfileRequest } from "@/domain/clinicProfile/prompts";
import { buildClinicProfileSystemPrompt, buildClinicProfileUserPrompt } from "@/domain/clinicProfile/prompts";

const req = (): ClinicProfileRequest => ({
  clinicId: "mock-on-005",
  businessName: "Mock Queen West MedSpa",
  streetAddress: "650 Queen St W",
  city: "Toronto",
  provinceCode: "ON",
  postalCode: "M6J 1E5",
  knownWebsite: null,
  knownPhone: null,
});

describe("ClinicProfileProvider — mock", () => {
  it("returns a schema-valid profile with sources", async () => {
    const r = await new MockClinicProfileProvider().research(req());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(validateClinicWebProfile(r.profile).ok).toBe(true);
      expect(r.profile.sources.length).toBeGreaterThan(0);
      expect(r.profile.matchConfidence).toBe("LOW");
      expect(r.profile.products.map((p) => p.kind)).toEqual(["injectable", "device", "skincare"]);
    }
  });

  it("fails when unavailable", async () => {
    const r = await new MockClinicProfileProvider({ unavailable: true }).research(req());
    expect(r.ok).toBe(false);
  });
});

describe("ClinicProfileProvider — claude", () => {
  it("is disabled without API key and does not call the network", async () => {
    const p = new ClaudeClinicProfileProvider({ apiKey: "" });
    expect(p.isEnabled()).toBe(false);
    expect(p.getUnavailableReason()).toMatch(/ANTHROPIC_API_KEY/);
    const r = await p.research(req());
    expect(r.ok).toBe(false);
  });
});

describe("ClinicProfileProvider — factory", () => {
  afterEach(() => {
    resetClinicProfileProviderForTests();
    vi.unstubAllEnvs();
  });

  it("defaults to mock without a key", () => {
    vi.stubEnv("CLINIC_PROFILE_PROVIDER", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(getClinicProfileProvider().name).toBe("mock");
  });

  it("defaults to claude when a key is present", () => {
    vi.stubEnv("CLINIC_PROFILE_PROVIDER", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect(getClinicProfileProvider().name).toBe("claude");
  });

  it("does not fall back when claude is forced without a key", () => {
    vi.stubEnv("CLINIC_PROFILE_PROVIDER", "claude");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const p = getClinicProfileProvider();
    expect(p.name).toBe("claude");
    expect(p.isEnabled()).toBe(false);
  });

  it("supports disabled", () => {
    vi.stubEnv("CLINIC_PROFILE_PROVIDER", "disabled");
    expect(getClinicProfileProvider().isEnabled()).toBe(false);
  });
});

describe("clinic profile schema", () => {
  it("rejects product recommendation fields", () => {
    const r = validateClinicWebProfile({
      clinicName: "X",
      matchConfidence: "HIGH",
      recommendedProduct: "Aptos",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown social platforms and unknown keys", () => {
    const base = { clinicName: "X", matchConfidence: "HIGH" };
    expect(
      validateClinicWebProfile({ ...base, socialProfiles: [{ platform: "myspace", url: "https://a.b" }] }).ok,
    ).toBe(false);
    expect(validateClinicWebProfile({ ...base, extra: 1 }).ok).toBe(false);
  });

  it("fills defaults for a minimal valid object", () => {
    const r = validateClinicWebProfile({ clinicName: "X", matchConfidence: "MEDIUM" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.emails).toEqual([]);
      expect(r.value.websiteSummary).toBeNull();
      expect(r.value.products).toEqual([]);
    }
  });

  it("trims over-long labels and caps lists instead of rejecting the whole profile", () => {
    const base = { clinicName: "X", matchConfidence: "HIGH" };
    const long = "Bookings, general enquiries and everything else you might want to ask the front desk about";
    const r = validateClinicWebProfile({
      ...base,
      emails: [{ address: "info@clinic.example", label: long, sourceUrl: "https://clinic.example" }],
      people: Array.from({ length: 14 }, (_, i) => ({ name: `Person ${i}`, role: "Injector" })),
      services: ["Injectables", "", "   ", "Laser"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.emails[0]?.label).toHaveLength(60);
      expect(r.value.people).toHaveLength(12);
      expect(r.value.services).toEqual(["Injectables", "Laser"]);
    }
    // Shape errors still reject.
    expect(validateClinicWebProfile({ ...base, emails: [{ address: "x" }] }).ok).toBe(false);
  });

  it("rejects the fields Google Places already provides", () => {
    const base = { clinicName: "X", matchConfidence: "HIGH" };
    expect(validateClinicWebProfile({ ...base, phones: [{ number: "+1 416 555 0100" }] }).ok).toBe(false);
    expect(validateClinicWebProfile({ ...base, website: { url: "https://clinic.example" } }).ok).toBe(false);
    expect(validateClinicWebProfile({ ...base, address: { city: "Toronto" } }).ok).toBe(false);
    expect(validateClinicWebProfile({ ...base, openingHours: [{ label: "Mon", hours: "9-5" }] }).ok).toBe(false);
  });

  it("accepts published products with a kind and a source, rejects unknown kinds", () => {
    const base = { clinicName: "X", matchConfidence: "HIGH" };
    const ok = validateClinicWebProfile({ ...base, products: [{ name: "Sculptra", kind: "injectable", context: "Injectables page", sourceUrl: "https://clinic.example/injectables" }] });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.products[0]?.kind).toBe("injectable");
    const defaulted = validateClinicWebProfile({ ...base, products: [{ name: "Something" }] });
    expect(defaulted.ok).toBe(true);
    if (defaulted.ok) expect(defaulted.value.products[0]?.kind).toBe("other");
    expect(validateClinicWebProfile({ ...base, products: [{ name: "X", kind: "furniture" }] }).ok).toBe(false);
  });

  it("extracts JSON from prose and code fences", () => {
    expect(extractJsonObject('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('Result: {"a":{"b":2}} done')).toEqual({ a: { b: 2 } });
    expect(() => extractJsonObject("nothing here")).toThrow();
  });
});

describe("clinic profile prompts", () => {
  it("treat web content as untrusted and forbid recommendations", () => {
    const s = buildClinicProfileSystemPrompt();
    expect(s).toMatch(/UNTRUSTED/);
    expect(s).toMatch(/Do not recommend products/);
    expect(s).toMatch(/sourceUrl/);
    expect(s).toMatch(/never infer a brand/);
    expect(s).toMatch(/"products": \[/);
  });

  it("leave address, phone, website and hours to Google Places", () => {
    const s = buildClinicProfileSystemPrompt();
    expect(s).toMatch(/Do NOT report those/);
    expect(s).not.toMatch(/"phones": \[/);
    expect(s).not.toMatch(/"website": \{/);
    expect(s).not.toMatch(/"address": \{/);
    expect(s).not.toMatch(/"openingHours": \[/);
    const u = buildClinicProfileUserPrompt({ ...req(), knownWebsite: "https://clinic.example", knownPhone: "+1 416 555 0100" });
    expect(u).toMatch(/website on file \(Google Places\): https:\/\/clinic.example/);
    expect(u).toMatch(/Do not report them back/);
  });

  it("include the clinic identity and strip secrets", () => {
    const u = buildClinicProfileUserPrompt({ ...req(), knownPhone: "ANTHROPIC_API_KEY=sk-abc123456789012" });
    expect(u).toMatch(/Mock Queen West MedSpa/);
    expect(u).toMatch(/Ontario/);
    expect(u).not.toMatch(/sk-abc123456789012/);
  });
});
