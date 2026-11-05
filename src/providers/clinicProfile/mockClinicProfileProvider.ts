import type { ClinicProfileRequest } from "@/domain/clinicProfile/prompts";
import type { ClinicWebProfile } from "@/domain/clinicProfile/schema";
import type { ClinicProfileProvider, ClinicProfileResult } from "./types";

/**
 * Deterministic fixture — no network, no API key. Clearly labelled as mock
 * so nobody mistakes it for a real contact record.
 */
export class MockClinicProfileProvider implements ClinicProfileProvider {
  readonly name = "mock";
  private unavailable: boolean;
  private reason: string;

  constructor(opts?: { unavailable?: boolean; reason?: string }) {
    this.unavailable = opts?.unavailable ?? false;
    this.reason = opts?.reason ?? "Mock clinic profile provider marked unavailable";
  }

  isEnabled(): boolean {
    return !this.unavailable;
  }

  getUnavailableReason(): string | null {
    return this.unavailable ? this.reason : null;
  }

  async research(request: ClinicProfileRequest): Promise<ClinicProfileResult> {
    if (this.unavailable) {
      return { ok: false, provider: this.name, error: this.reason };
    }
    const site = request.knownWebsite ?? `https://mock-${slug(request.businessName)}.example`;
    const profile: ClinicWebProfile = {
      clinicName: request.businessName,
      matchConfidence: "LOW",
      matchReason: "Mock provider — fixture data, not a real lookup",
      address: {
        street: request.streetAddress,
        city: request.city,
        province: request.provinceCode,
        postalCode: request.postalCode,
        formatted: [request.streetAddress, request.city, request.provinceCode, request.postalCode]
          .filter(Boolean)
          .join(", ") || null,
        sourceUrl: site,
      },
      phones: [{ number: request.knownPhone ?? "+1 555 010 0000", label: "main (mock)", sourceUrl: site }],
      emails: [{ address: `info@mock-${slug(request.businessName)}.example`, label: "mock", sourceUrl: site }],
      website: { url: site, sourceUrl: site },
      socialProfiles: [
        {
          platform: "instagram",
          url: `https://instagram.com/mock_${slug(request.businessName)}`,
          handle: `@mock_${slug(request.businessName)}`,
          sourceUrl: site,
        },
      ],
      people: [{ name: "Mock Clinic Manager", role: "Clinic manager (mock)", snippet: null, sourceUrl: site }],
      openingHours: [{ label: "Mon–Fri", hours: "9:00 AM – 5:00 PM (mock)", sourceUrl: site }],
      services: ["Mock injectables", "Mock skin treatments"],
      products: [
        { name: "Mock Neuromodulator", kind: "injectable", context: "listed under Injectables (mock)", sourceUrl: site },
        { name: "Mock Laser 3000", kind: "device", context: "device page (mock)", sourceUrl: site },
        { name: "Mock Skincare Line", kind: "skincare", context: "shop page (mock)", sourceUrl: site },
      ],
      websiteSummary: "Mock summary — set CLINIC_PROFILE_PROVIDER=claude and ANTHROPIC_API_KEY for real research.",
      notes: ["This profile is fixture data from the mock provider."],
      unknowns: ["medical director"],
      sources: [{ url: site, title: "Mock source" }],
    };
    return {
      ok: true,
      profile,
      provider: this.name,
      model: null,
      latencyMs: 0,
      searchesUsed: 0,
    };
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "clinic";
}
