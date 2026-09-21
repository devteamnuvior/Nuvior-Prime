/**
 * Zod schemas for research provider output — no arbitrary JSON, no product recommendations.
 */

import { z } from "zod";
import { CAPABILITY_TAGS } from "@/domain/products/capabilityTaxonomy";
import {
  EXTRACTION_CONFIDENCE_LEVELS,
  INVENTORY_STATES,
} from "./clinicCapabilityProfile";

const capabilityTagSchema = z.enum(CAPABILITY_TAGS as unknown as [string, ...string[]]);

export const researchEvidenceSchema = z.object({
  sourceUrl: z.string().nullable(),
  sourceType: z.enum(["website", "mock"]),
  snippet: z.string().min(1).max(500),
  confidence: z.enum(EXTRACTION_CONFIDENCE_LEVELS),
});

export const researchItemSchema = z.object({
  normalizedValue: z.string().min(1).max(200),
  rawSourceWording: z.string().max(300).optional(),
  capabilityTag: capabilityTagSchema.optional(),
  inventoryState: z.enum(INVENTORY_STATES),
  confidence: z.enum(EXTRACTION_CONFIDENCE_LEVELS),
  evidence: z.array(researchEvidenceSchema).optional(),
  reviewedScope: z.string().max(400).optional(),
});

export const notFoundCapabilitySchema = z.object({
  capabilityTag: capabilityTagSchema,
  reviewedScope: z.string().min(1).max(400),
  confidence: z.enum(EXTRACTION_CONFIDENCE_LEVELS),
});

export const researchExtractionSchema = z
  .object({
    services: z.array(researchItemSchema).default([]),
    capabilities: z.array(researchItemSchema).default([]),
    brands: z.array(researchItemSchema).default([]),
    devices: z.array(researchItemSchema).default([]),
    practitioners: z.array(researchItemSchema).default([]),
    practitionerTypes: z.array(researchItemSchema).default([]),
    clinicalFocusAreas: z.array(researchItemSchema).default([]),
    notFoundCapabilities: z.array(notFoundCapabilitySchema).default([]),
    ambiguities: z
      .array(z.object({ topic: z.string(), reason: z.string() }))
      .default([]),
    unknowns: z.array(z.string()).default([]),
  })
  .strict();

export type ResearchExtractionPayload = z.infer<typeof researchExtractionSchema>;

export function validateResearchExtraction(raw: unknown):
  | { ok: true; value: ResearchExtractionPayload; warnings: string[] }
  | { ok: false; errors: string[] } {
  const parsed = researchExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const warnings: string[] = [];
  const value = parsed.data;

  if (raw && typeof raw === "object" && "productRecommendation" in raw) {
    return { ok: false, errors: ["Product recommendations are not allowed in Stage C extraction"] };
  }
  if (raw && typeof raw === "object" && "nuviorProductId" in raw) {
    return { ok: false, errors: ["Product catalog IDs are not allowed in Stage C extraction"] };
  }

  const allItems = [
    ...value.services,
    ...value.capabilities,
    ...value.brands,
    ...value.devices,
    ...value.practitioners,
    ...value.practitionerTypes,
    ...value.clinicalFocusAreas,
  ];

  for (const item of allItems) {
    if (item.inventoryState === "CONFIRMED_PRESENT") {
      if (!item.evidence?.length) {
        return {
          ok: false,
          errors: [
            `CONFIRMED_PRESENT "${item.normalizedValue}" requires at least one evidence snippet`,
          ],
        };
      }
    }
    if (item.inventoryState === "CONFIRMED_ABSENT" && !item.evidence?.length) {
      return {
        ok: false,
        errors: [
          `CONFIRMED_ABSENT "${item.normalizedValue}" requires explicit absence evidence`,
        ],
      };
    }
    if (item.inventoryState === "NOT_FOUND" && !item.reviewedScope) {
      warnings.push(`NOT_FOUND item "${item.normalizedValue}" missing reviewedScope — adding default`);
    }
  }

  return { ok: true, value, warnings };
}
