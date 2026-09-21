/**
 * Locked facts — deterministic Phase 1–4 outputs the LLM cannot change.
 */

import type { LeadProductCode } from "@/domain/terminology";
import type { CertificationPathwayCode } from "@/domain/terminology";
import type { MatchState } from "@/domain/crm/matching";
import type { LastOrderStatus } from "@/domain/crm/lastOrder";

export type LockedBriefFacts = {
  accountId: string;
  accountName: string;
  placeId: string | null;
  segmentNumber: number;
  categoryNumber: number;
  categoryLabel: string;
  organizationTypeLabel: string;
  provinceCode: string;
  fitScore: number;
  leadProduct: LeadProductCode;
  leadProductLabel: string;
  certificationPathwayFit: CertificationPathwayCode | string;
  openingAngle: string;
  isRevisit: boolean;
  doNotContact: boolean;
  formerMesoesteticCustomer: boolean;
  aptosProductAllowed: boolean;
  aptosCertificationLevel: string | null;
  hasAcademyAccount: boolean | null;
  crmMatchState: MatchState | string | null;
  crmExternalId: string | null;
  lastOrderStatus: LastOrderStatus | null;
  visitType: "first visit" | "re-visit" | "follow-up on a quote";
  seasonLabel: string;
  seasonalPitchOrder: string[];
  provinceUvNote: string;
};

export type EvidenceSnippet = {
  fieldPath: string;
  value: string;
  sourceType: string;
  sourceUrl: string | null;
  snippet: string | null;
  verificationState: string;
};

export type SynthesisContext = {
  locked: LockedBriefFacts;
  evidence: EvidenceSnippet[];
  knownPublic: {
    serviceMenuSummary: string;
    skincareLines: string;
    practitionersSummary: string;
    pricePositioning: string;
    enrichedThreads: string | null;
    enrichedPrp: string | null;
    mesoesteticOnWebsite: boolean;
    thinPublicData: boolean;
  };
  lastVisitNotes: string | null;
  thinInputWarnings: string[];
  /** Template brief sections used as baseline / fallback */
  templateBaseline: {
    snapshotThreeLines: [string, string, string];
    leadProductWhy: string;
    secondProductIfFirstLands: string;
    openingLines: { cold: string; knowsNuvior: string; revisit: string };
    fiveQuestions: string[];
    signalsToReadOnSite: string[];
    objectionsAndResponses: { objection: string; response: string }[];
    theAsk: string;
    leaveBehind: string;
    doNotSay: string[];
  };
};
