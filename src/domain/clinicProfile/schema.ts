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

/**
 * Claude occasionally overshoots a length ("Bookings & general enquiries (front desk)…")
 * or a list size. A long value is still a true fact, so it is trimmed to fit rather than
 * failing the whole profile after a minute of research. Only shape and type errors reject.
 */
const trimTo = (max: number) => (v: unknown) => (typeof v === "string" ? v.trim().slice(0, max) : v);
/** Optional text: trimmed to `max`; empty stays empty (callers make it nullable). */
const clamp = (max: number) => z.preprocess(trimTo(max), z.string().max(max));
/** Required text: trimmed to `max`, must not be empty. */
const text = (max: number, min = 1) => z.preprocess(trimTo(max), z.string().min(min).max(max));
/** A list capped at `max` items, with empty strings dropped. */
const limit = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => !(typeof x === "string" && !x.trim())).slice(0, max) : v), z.array(item).max(max));

const url = text(2000);
const shortText = text(300);

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
  province: clamp(60).nullable().default(null),
  postalCode: clamp(20).nullable().default(null),
  formatted: clamp(400).nullable().default(null),
  ...sourced,
});

export const clinicPhoneSchema = z.object({
  number: text(40, 3),
  label: clamp(60).nullable().default(null),
  ...sourced,
});

export const clinicEmailSchema = z.object({
  address: text(200, 3),
  label: clamp(60).nullable().default(null),
  ...sourced,
});

export const clinicSocialSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: url,
  handle: clamp(100).nullable().default(null),
  ...sourced,
});

export const clinicPersonSchema = z.object({
  name: shortText,
  role: shortText,
  snippet: clamp(400).nullable().default(null),
  ...sourced,
});

export const clinicHoursSchema = z.object({
  label: text(80),
  hours: text(120),
  ...sourced,
});

export const PRODUCT_KINDS = ["injectable", "device", "skincare", "treatment", "other"] as const;

/** A product, brand or device the clinic publishes that it uses or sells. */
export const clinicProductSchema = z.object({
  name: shortText,
  kind: z.enum(PRODUCT_KINDS).default("other"),
  /** Where it was mentioned, e.g. "listed under Injectables", "Botox page". */
  context: clamp(300).nullable().default(null),
  ...sourced,
});

export const clinicSourceSchema = z.object({
  url: url,
  title: clamp(300).nullable().default(null),
});

export const clinicWebProfileSchema = z
  .object({
    clinicName: shortText,
    matchConfidence: z.enum(MATCH_CONFIDENCE),
    matchReason: clamp(400).nullable().default(null),
    address: clinicAddressSchema.nullable().default(null),
    phones: limit(clinicPhoneSchema, 10).default([]),
    emails: limit(clinicEmailSchema, 10).default([]),
    website: z
      .object({ url: url, ...sourced })
      .nullable()
      .default(null),
    socialProfiles: limit(clinicSocialSchema, 12).default([]),
    people: limit(clinicPersonSchema, 12).default([]),
    openingHours: limit(clinicHoursSchema, 10).default([]),
    services: limit(text(120), 30).default([]),
    products: limit(clinicProductSchema, 40).default([]),
    websiteSummary: clamp(1500).nullable().default(null),
    notes: limit(text(300), 10).default([]),
    unknowns: limit(text(200), 20).default([]),
    sources: limit(clinicSourceSchema, 20).default([]),
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
