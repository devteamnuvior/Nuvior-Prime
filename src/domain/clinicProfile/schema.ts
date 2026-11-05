/**
 * Clinic web profile — public contact/identity facts about a clinic, gathered
 * by the research provider from public web sources. Every fact carries the
 * URL it was read from; anything not found stays out (or lands in `unknowns`).
 *
 * It also records the products, brands and devices the clinic itself says it
 * uses or sells — as published, never inferred. No product recommendations,
 * no qualification, no CRM/DNC decisions.
 */

import { z } from "zod";

/** v2 adds `products` (brands, devices, skincare lines the clinic publishes). Older rows show as stale. */
export const CLINIC_PROFILE_PROMPT_VERSION = "clinic-profile-v2";

const url = z.string().min(1).max(2000);
const shortText = z.string().min(1).max(300);

const sourced = {
  sourceUrl: url.nullable().default(null),
};

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "other",
] as const;

export const MATCH_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

export const clinicAddressSchema = z.object({
  street: shortText.nullable().default(null),
  city: shortText.nullable().default(null),
  province: z.string().max(60).nullable().default(null),
  postalCode: z.string().max(20).nullable().default(null),
  formatted: z.string().max(400).nullable().default(null),
  ...sourced,
});

export const clinicPhoneSchema = z.object({
  number: z.string().min(3).max(40),
  label: z.string().max(60).nullable().default(null),
  ...sourced,
});

export const clinicEmailSchema = z.object({
  address: z.string().min(3).max(200),
  label: z.string().max(60).nullable().default(null),
  ...sourced,
});

export const clinicSocialSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: url,
  handle: z.string().max(100).nullable().default(null),
  ...sourced,
});

export const clinicPersonSchema = z.object({
  name: shortText,
  role: shortText,
  snippet: z.string().max(400).nullable().default(null),
  ...sourced,
});

export const clinicHoursSchema = z.object({
  label: z.string().min(1).max(80),
  hours: z.string().min(1).max(120),
  ...sourced,
});

export const PRODUCT_KINDS = ["injectable", "device", "skincare", "treatment", "other"] as const;

/** A product, brand or device the clinic publishes that it uses or sells. */
export const clinicProductSchema = z.object({
  name: shortText,
  kind: z.enum(PRODUCT_KINDS).default("other"),
  /** Where it was mentioned, e.g. "listed under Injectables", "Botox page". */
  context: z.string().max(300).nullable().default(null),
  ...sourced,
});

export const clinicSourceSchema = z.object({
  url: url,
  title: z.string().max(300).nullable().default(null),
});

export const clinicWebProfileSchema = z
  .object({
    clinicName: shortText,
    matchConfidence: z.enum(MATCH_CONFIDENCE),
    matchReason: z.string().max(400).nullable().default(null),
    address: clinicAddressSchema.nullable().default(null),
    phones: z.array(clinicPhoneSchema).max(10).default([]),
    emails: z.array(clinicEmailSchema).max(10).default([]),
    website: z
      .object({ url: url, ...sourced })
      .nullable()
      .default(null),
    socialProfiles: z.array(clinicSocialSchema).max(12).default([]),
    people: z.array(clinicPersonSchema).max(12).default([]),
    openingHours: z.array(clinicHoursSchema).max(10).default([]),
    services: z.array(z.string().min(1).max(120)).max(30).default([]),
    products: z.array(clinicProductSchema).max(40).default([]),
    websiteSummary: z.string().max(1500).nullable().default(null),
    notes: z.array(z.string().min(1).max(300)).max(10).default([]),
    unknowns: z.array(z.string().min(1).max(200)).max(20).default([]),
    sources: z.array(clinicSourceSchema).max(20).default([]),
  })
  .strict();

export type ClinicWebProfile = z.infer<typeof clinicWebProfileSchema>;
export type ClinicProduct = z.infer<typeof clinicProductSchema>;

const FORBIDDEN_KEYS = /recommend|nuviorProduct|opportunityScore|leadProduct|fitScore/i;

export function validateClinicWebProfile(
  raw: unknown,
): { ok: true; value: ClinicWebProfile } | { ok: false; errors: string[] } {
  const serialized = JSON.stringify(raw ?? null);
  if (FORBIDDEN_KEYS.test(serialized)) {
    return { ok: false, errors: ["Profile contains product recommendation fields"] };
  }
  const parsed = clinicWebProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`),
    };
  }
  return { ok: true, value: parsed.data };
}

/** Pull the first JSON object out of a model reply that may have prose around it. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("No JSON object found in model output");
}
