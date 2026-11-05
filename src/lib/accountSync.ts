/**
 * Keeps an Account row for every in-taxonomy clinic the planner discovers, keyed
 * by Google place id. Route items, visit records, XP and team-visit marks all
 * hang off Account, so a clinic that only ever came from Places must still exist
 * here. Public facts (address, phone, website, rating, hours) refresh on every
 * run; CRM-owned internal status is never written from here.
 */

import { prisma } from "@/lib/prisma";
import type { OrganizationType, Prisma } from "@prisma/client";
import type { ClassificationResult } from "@/domain/classifyPlace";
import type { RawPlace } from "@/providers/places/types";

const ORGANIZATION_TYPES: readonly string[] = ["INDEPENDENT", "CHAIN_LOCATION", "CHAIN_HEAD_OFFICE", "HOSPITAL_OR_ACADEMIC"];

function organizationType(code: string): OrganizationType {
  return (ORGANIZATION_TYPES.includes(code) ? code : "INDEPENDENT") as OrganizationType;
}

/** Upserts one Account per place. Never throws: a sync failure must not block planning. Returns how many rows were written. */
export async function syncDiscoveredAccounts(discovered: readonly { place: RawPlace; classification: ClassificationResult }[]): Promise<number> {
  // Unit tests run the planner against mock places; they must never write clinics into a real database.
  if (process.env.VITEST) return 0;
  let written = 0;
  for (const { place, classification } of discovered) {
    if (!classification.inTaxonomy || !place.placeId) continue;
    const core = {
      businessName: place.businessName,
      organizationType: organizationType(classification.organizationType),
      segmentNumber: classification.segmentNumber,
      categoryNumber: classification.categoryNumber,
      categoryLabel: classification.categoryLabel,
      streetAddress: place.streetAddress,
      unitSuite: place.unitSuite,
      city: place.city,
      provinceCode: place.provinceCode,
      postalCode: place.postalCode,
      googleMapsUrl: place.googleMapsUrl,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    const profile = {
      mainPhone: place.mainPhone || "UNKNOWN, verify",
      website: place.website,
      googleRating: place.googleRating,
      googleReviewCount: place.googleReviewCount,
      openingHoursJson: (place.openingHoursJson ?? undefined) as Prisma.InputJsonValue | undefined,
    };
    try {
      await prisma.account.upsert({
        where: { placeId: place.placeId },
        create: { ...core, placeId: place.placeId, dataCompleteness: "needs_verification", publicProfile: { create: profile } },
        update: { ...core, publicProfile: { upsert: { create: profile, update: profile } } },
      });
      written += 1;
    } catch (e) {
      console.warn(`[accountSync] ${place.businessName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return written;
}
