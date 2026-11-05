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

/** How far back a logged team visit keeps a clinic off a rep's day. */
export const TEAM_VISIT_LOOKBACK_DAYS = 90;

/** The latest logged visit to a clinic by anyone on the team (src/lib/teamVisits.ts). */
export type TeamVisitMark = {
  /** YYYY-MM-DD */
  visitedOn: string;
  byUserId: string | null;
  byName: string;
  /** True when the planning rep logged it themselves. */
  mine: boolean;
};

/** A nearby clinic left out of the day because the team already visited it; shown on the map, never routed. */
export type VisitedNearbyEntry = {
  accountId: string;
  businessName: string;
  streetAddress: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  visitedOn: string;
  visitedBy: string;
  mine: boolean;
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
  /** Logged team visits keyed by candidate id (place id). A CRM revisit-due flag still wins. */
  teamVisits?: Record<string, TeamVisitMark>;
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
  /** Nearest first. The target slice is taken after these are removed, so the day is filled with other clinics. */
  visitedNearby: VisitedNearbyEntry[];
  excludedDebug: string[];
};

export function buildDailyVisitList(
  request: VisitListRequest,
  candidates: ProspectCandidate[],
): VisitListResult {
  const excludedDoNotContact: string[] = [];
  const excludedAlreadyVisited: string[] = [];
  const visitedNearby: VisitedNearbyEntry[] = [];
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

    // A visit anyone on the team logged recently takes the clinic off today's list
    // (unless CRM says a revisit is due) and shows it on the map as visited instead.
    const teamVisit = request.teamVisits?.[c.id] ?? (c.placeId ? request.teamVisits?.[c.placeId] : undefined);
    if (teamVisit && !revisit.isRevisit && !c.qualificationInput.doNotContact) {
      visitedNearby.push({
        accountId: c.id,
        businessName: c.businessName,
        streetAddress: c.streetAddress,
        city: c.city,
        latitude: c.latitude,
        longitude: c.longitude,
        distanceKm: Math.round(distanceKm * 10) / 10,
        visitedOn: teamVisit.visitedOn,
        visitedBy: teamVisit.mine ? "You" : teamVisit.byName,
        mine: teamVisit.mine,
      });
      excludedDebug.push(`${c.businessName}: visited ${teamVisit.visitedOn} by ${teamVisit.mine ? "you" : teamVisit.byName}`);
      continue;
    }

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
  visitedNearby.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    entries,
    presentationEntries,
    qualifiedPool,
    radiusExhausted,
    unverifiedAccounts,
    excludedDoNotContact,
    excludedAlreadyVisited,
    visitedNearby,
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
