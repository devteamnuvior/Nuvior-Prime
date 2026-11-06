/**
 * Deterministic qualification engine: Do-Not-Contact exclusion, certification pathway and scope rules
 * (IMPLEMENTATION_PLAN.md §5). The 1–5 fit score, the clinic taxonomy and the lead product were removed on 2026-11-05.
 */

import { evaluateScopeOfPractice, type AccountCredentialSignals } from "./scopeOfPractice";
import type { CertificationPathwayCode } from "./terminology";
import {
  nextCertificationHint,
  pathwayFromCredentials,
  resolvePathway,
} from "./crm/certification";

export type QualificationInput = {
  businessName: string;
  provinceCode: string;
  credentials: AccountCredentialSignals;
  advertisesThreadLifting: boolean | null;
  pricePositioning: "value" | "mid" | "premium" | "unknown";
  formerMesoesteticCustomer: boolean;
  doNotContact: boolean;
  hasAcademyAccount: boolean | null;
  aptosPathway: CertificationPathwayCode;
  /** CRM-owned certification progress — never inferred from public web alone */
  aptosCertificationLevel?: string | null;
  injectablesOffered: string;
  threadsOffered: string;
  skincareLines: string;
};

export type QualificationResult = {
  excluded: boolean;
  exclusionReason: string | null;
  certificationPathwayFit: CertificationPathwayCode;
  openingAngle: string;
  scopeBlockedProducts: string[];
  scopeNotes: string[];
};

function buildOpeningAngle(input: QualificationInput, pathway: CertificationPathwayCode): string {
  if (input.formerMesoesteticCustomer) {
    return "Former Mesoestetic customer — remaining Mesoestetic stock only while it lasts.";
  }
  return nextCertificationHint(pathway, input.aptosCertificationLevel) ?? "Confirm services and practitioners on site.";
}

export function qualifyAccount(input: QualificationInput): QualificationResult {
  if (input.doNotContact) {
    return {
      excluded: true,
      exclusionReason: "Do-Not-Contact",
      certificationPathwayFit: "NONE",
      openingAngle: "Flagged Do-Not-Contact — do not list as a prospect.",
      scopeBlockedProducts: [],
      scopeNotes: [],
    };
  }

  const scope = evaluateScopeOfPractice(input.provinceCode, input.credentials);
  const derived = pathwayFromCredentials(input.provinceCode, input.credentials);
  const pathway = resolvePathway({
    crmPathway: input.aptosPathway,
    derivedPathway: derived,
  });

  return {
    excluded: false,
    exclusionReason: null,
    certificationPathwayFit: pathway,
    openingAngle: buildOpeningAngle(input, pathway),
    scopeBlockedProducts: scope.blockedProducts,
    scopeNotes: scope.notes,
  };
}
