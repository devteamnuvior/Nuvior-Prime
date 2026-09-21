/**
 * Daily visit list assembly — spec §02 method + §07 presentation sort.
 */

import { haversineKm, postalCodePrefix, type GeoPoint } from "./geo";
import { qualifyAccount, type QualificationInput, type QualificationResult } from "./qualification";
import type { LeadProductCode } from "./terminology";
import { resolveRevisitFlags } from "./crm/revisit";

export type ProspectCandidate = {
  id: string;
  businessName: string;
  parentGroupName: string | null;
  organizationTypeLabel: string;
  segmentNumber: number;
  categoryNumber: number;
  categoryLabel: string;
  streetAddress: string;
  city: string;
  provinceCode: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  placeId: string | null;
  dataCompleteness: string;
  qualificationInput: Omit<
    QualificationInput,
    | "businessName"
    | "provinceCode"
    | "segmentNumber"
    | "categoryNumber"
    | "categoryLabel"
    | "organizationTypeLabel"
  > &
    Partial<Pick<QualificationInput, "businessName" | "provinceCode">>;
};

export type VisitListRequest = {
  provinceCode: string;
  startPoint: GeoPoint;
  dailyVisitTarget: number;
  maxRadiusKm: number;
  minFitScore: number;
  alreadyVisitedNames: string[];
  revisitNames: string[];
  /** CRM placeIds / names due for revisit */
  crmRevisitKeys?: string[];
  /** CRM placeIds / names already visited and not due */
  crmAlreadyVisitedKeys?: string[];
};

export type VisitListEntry = {
  accountId: string;
  businessName: string;
  segmentNumber: number;
  categoryNumber: number;
  categoryLabel: string;
  organizationTypeLabel: string;
  streetAddress: string;
  city: string;
  provinceCode: string;
  postalCode: string;
  postalCodePrefix: string;
  distanceKm: number;
  isRevisit: boolean;
  fitScore: number;
  leadProduct: LeadProductCode;
  leadProductLabel: string;
  openingAngle: string;
  certificationPathwayFit: string;
  needsManualVerification: boolean;
  googleMapsUrl: string | null;
  qualification: QualificationResult;
};

export type VisitListResult = {
  entries: VisitListEntry[];
  /** Spec §07 presentation: postal prefix then fit score descending */
  presentationEntries: VisitListEntry[];
  /** All accounts that passed qualification filters before target slice / routing */
  qualifiedPool: VisitListEntry[];
  radiusExhausted: boolean;
  unverifiedAccounts: VisitListEntry[];
  excludedDoNotContact: string[];
  excludedAlreadyVisited: string[];
  excludedDebug: string[];
};

export function buildDailyVisitList(
  request: VisitListRequest,
  candidates: ProspectCandidate[],
): VisitListResult {
  const excludedDoNotContact: string[] = [];
  const excludedAlreadyVisited: string[] = [];
  const excludedDebug: string[] = [];
  const scored: VisitListEntry[] = [];

  for (const c of candidates) {
    if (c.provinceCode !== request.provinceCode) continue;

    const distanceKm = haversineKm(request.startPoint, {
      lat: c.latitude,
      lng: c.longitude,
    });
    if (distanceKm > request.maxRadiusKm) continue;

    const revisit = resolveRevisitFlags({
      pasteRevisitNames: request.revisitNames,
      pasteAlreadyVisitedNames: request.alreadyVisitedNames,
      crmRevisitKeys: request.crmRevisitKeys ?? [],
      crmAlreadyVisitedKeys: request.crmAlreadyVisitedKeys ?? [],
      businessName: c.businessName,
      placeId: c.placeId,
      doNotContact: c.qualificationInput.doNotContact,
    });

    if (revisit.alreadyVisitedExclude && !revisit.isRevisit) {
      if (c.qualificationInput.doNotContact) {
        // DNC handled below via qualify
      } else {
        excludedAlreadyVisited.push(c.businessName);
        excludedDebug.push(`${c.businessName}: excluded already-visited (${revisit.source})`);
        continue;
      }
    }

    const qInput: QualificationInput = {
      businessName: c.businessName,
      provinceCode: c.provinceCode,
      segmentNumber: c.segmentNumber,
      categoryNumber: c.categoryNumber,
      categoryLabel: c.categoryLabel,
      organizationTypeLabel: c.organizationTypeLabel,
      credentials: c.qualificationInput.credentials,
      advertisesThreadLifting: c.qualificationInput.advertisesThreadLifting,
      pricePositioning: c.qualificationInput.pricePositioning,
      formerMesoesteticCustomer: c.qualificationInput.formerMesoesteticCustomer,
      doNotContact: c.qualificationInput.doNotContact,
      hasAcademyAccount: c.qualificationInput.hasAcademyAccount,
      aptosPathway: c.qualificationInput.aptosPathway,
      aptosCertificationLevel: c.qualificationInput.aptosCertificationLevel ?? null,
      injectablesOffered: c.qualificationInput.injectablesOffered,
      threadsOffered: c.qualificationInput.threadsOffered,
      skincareLines: c.qualificationInput.skincareLines,
    };

    const qualification = qualifyAccount(qInput);
    if (qualification.exclusionReason === "Do-Not-Contact") {
      excludedDoNotContact.push(c.businessName);
      excludedDebug.push(`${c.businessName}: DNC excluded`);
      continue;
    }
    if (qualification.excluded) continue;
    if (qualification.fitScore < request.minFitScore) continue;

    scored.push({
      accountId: c.id,
      businessName: c.businessName,
      segmentNumber: c.segmentNumber,
      categoryNumber: c.categoryNumber,
      categoryLabel: c.categoryLabel,
      organizationTypeLabel: c.organizationTypeLabel,
      streetAddress: c.streetAddress,
      city: c.city,
      provinceCode: c.provinceCode,
      postalCode: c.postalCode,
      postalCodePrefix: postalCodePrefix(c.postalCode),
      distanceKm: Math.round(distanceKm * 10) / 10,
      isRevisit: revisit.isRevisit,
      fitScore: qualification.fitScore,
      leadProduct: qualification.recommendedLeadProduct,
      leadProductLabel: qualification.recommendedLeadProductLabel,
      openingAngle: qualification.openingAngle,
      certificationPathwayFit: qualification.certificationPathwayFit,
      needsManualVerification: c.dataCompleteness !== "verified",
      googleMapsUrl: c.googleMapsUrl,
      qualification,
    });
  }

  // Spec §02: nearest → farthest; take up to daily target (revisits included by geography).
  // Routing optimization (Phase 8) may reorder from qualifiedPool downstream.
  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  const qualifiedPool = [...scored];
  const entries = scored.slice(0, request.dailyVisitTarget);
  const radiusExhausted = scored.length < request.dailyVisitTarget;

  const presentationEntries = [...entries].sort((a, b) => {
    const p = a.postalCodePrefix.localeCompare(b.postalCodePrefix);
    if (p !== 0) return p;
    return b.fitScore - a.fitScore;
  });

  const unverifiedAccounts = entries.filter((e) => e.needsManualVerification);

  return {
    entries,
    presentationEntries,
    qualifiedPool,
    radiusExhausted,
    unverifiedAccounts,
    excludedDoNotContact,
    excludedAlreadyVisited,
    excludedDebug,
  };
}

/** Parse pasted account lists from the rep form. */
export function parseAccountNameList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || /^none$/i.test(trimmed)) return [];
  return trimmed
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
