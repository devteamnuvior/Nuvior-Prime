/**
 * Deterministic qualification engine.
 * Lead product, certification pathway and scope rules: IMPLEMENTATION_PLAN.md §5. The 1–5 fit score was removed on 2026-11-05.
 * Never recommends Mesoestetic as lead product.
 */

import { evaluateScopeOfPractice, type AccountCredentialSignals } from "./scopeOfPractice";
import { isInTaxonomy } from "./taxonomy";
import {
  type CertificationPathwayCode,
  type LeadProductCode,
  LEAD_PRODUCT_LABELS,
} from "./terminology";
import {
  hasPartialCertification,
  isFullyCertified,
  nextCertificationHint,
  pathwayFromCredentials,
  resolvePathway,
} from "./crm/certification";

export type QualificationInput = {
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryNumber: number;
  categoryLabel: string;
  organizationTypeLabel: string;
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
  recommendedLeadProduct: LeadProductCode;
  recommendedLeadProductLabel: string;
  certificationPathwayFit: CertificationPathwayCode;
  openingAngle: string;
  scopeBlockedProducts: string[];
  scopeNotes: string[];
};

function hasInjectableSignal(input: QualificationInput): boolean {
  const text = `${input.injectablesOffered} ${input.threadsOffered}`.toLowerCase();
  if (text.includes("unknown")) {
    return (
      input.credentials.hasPhysicianOrNp ||
      input.credentials.hasRn ||
      input.advertisesThreadLifting === true
    );
  }
  return !text.includes("no") || text.includes("yes") || text.includes("botox") || text.includes("filler");
}

function chooseLeadProduct(
  input: QualificationInput,
  scope: ReturnType<typeof evaluateScopeOfPractice>,
  pathway: CertificationPathwayCode,
): LeadProductCode {
  // Spec §08: former Mesoestetic → Dermaceutic-led conversation; never Mesoestetic.
  if (input.formerMesoesteticCustomer && scope.skincareAllowed) {
    return "DERMACEUTIC";
  }

  const wantsThreads =
    input.advertisesThreadLifting === true ||
    input.threadsOffered.toLowerCase().includes("pdo") ||
    input.threadsOffered.toLowerCase().includes("thread");

  const certLevel = input.aptosCertificationLevel ?? null;
  const fullyCertified = isFullyCertified(certLevel);
  const partialCert = hasPartialCertification(certLevel);

  if (wantsThreads || (input.segmentNumber === 1 && hasInjectableSignal(input))) {
    if (scope.aptosProductAllowed) {
      if (fullyCertified || (partialCert && input.aptosPathway !== "NONE")) {
        return "APTOS";
      }
      if (input.aptosPathway === "NONE" && pathway !== "NONE" && !certLevel) {
        return pathway === "FOUR_LEVEL"
          ? "APTOS_4_LEVEL_CERTIFICATION"
          : "APTOS_3_LEVEL_CERTIFICATION";
      }
      return "APTOS";
    }
    if (scope.aptosCertificationLeadOk) {
      if (fullyCertified) {
        return "DERMACEUTIC";
      }
      const usePathway =
        input.aptosPathway !== "NONE" ? input.aptosPathway : pathway;
      return usePathway === "FOUR_LEVEL"
        ? "APTOS_4_LEVEL_CERTIFICATION"
        : "APTOS_3_LEVEL_CERTIFICATION";
    }
  }

  if (
    scope.fidiaAllowed &&
    (input.segmentNumber === 2 ||
      input.categoryLabel.toLowerCase().includes("hair") ||
      input.injectablesOffered.toLowerCase().includes("prp"))
  ) {
    return "FIDIA_HY_TISSUE_PRP";
  }

  if (input.segmentNumber <= 4 || input.skincareLines.toLowerCase().includes("peel")) {
    return "DERMACEUTIC";
  }

  if (input.segmentNumber >= 5) {
    return "GESKE";
  }

  return "DERMACEUTIC";
}

function buildOpeningAngle(
  input: QualificationInput,
  lead: LeadProductCode,
  pathway: CertificationPathwayCode,
): string {
  if (input.formerMesoesteticCustomer) {
    return "Former Mesoestetic customer — retention via Dermaceutic, remaining Mesoestetic stock only while it lasts.";
  }
  const certHint = nextCertificationHint(pathway, input.aptosCertificationLevel);
  if (certHint && (lead === "APTOS" || lead.startsWith("APTOS_"))) {
    return certHint;
  }
  if (lead === "APTOS" || lead.startsWith("APTOS_")) {
    if (input.advertisesThreadLifting) {
      return "Advertises thread lifting; confirm brand and certification — lead with Aptos training/product per scope.";
    }
    return "Physician/NP-led aesthetics fit; open on Aptos threads or matching certification pathway.";
  }
  if (lead === "FIDIA_HY_TISSUE_PRP") {
    return "PRP-capable medical setting with physician/NP on site — lead with Fidia Hy-tissue PRP.";
  }
  if (lead === "GESKE") {
    return "Retail/spa shelf opportunity — lead with GESKE devices, not injectables.";
  }
  return "In-taxonomy skincare/peel opportunity — lead with Dermaceutic.";
}

export function qualifyAccount(input: QualificationInput): QualificationResult {
  if (input.doNotContact) {
    return {
      excluded: true,
      exclusionReason: "Do-Not-Contact",
      recommendedLeadProduct: "DERMACEUTIC",
      recommendedLeadProductLabel: LEAD_PRODUCT_LABELS.DERMACEUTIC,
      certificationPathwayFit: "NONE",
      openingAngle: "Flagged Do-Not-Contact — do not list as a prospect.",
      scopeBlockedProducts: [],
      scopeNotes: [],
    };
  }

  if (!isInTaxonomy(input.segmentNumber, input.categoryNumber)) {
    return {
      excluded: true,
      exclusionReason: "Outside category taxonomy",
      recommendedLeadProduct: "DERMACEUTIC",
      recommendedLeadProductLabel: LEAD_PRODUCT_LABELS.DERMACEUTIC,
      certificationPathwayFit: "NONE",
      openingAngle: "Wrong category, skip.",
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
  const lead = chooseLeadProduct(input, scope, pathway);

  if ((lead as string) === "MESOESTETIC") {
    throw new Error("Invariant violated: Mesoestetic cannot be recommended as lead product.");
  }

  return {
    excluded: false,
    exclusionReason: null,
    recommendedLeadProduct: lead,
    recommendedLeadProductLabel: LEAD_PRODUCT_LABELS[lead],
    certificationPathwayFit: pathway,
    openingAngle: buildOpeningAngle(input, lead, pathway),
    scopeBlockedProducts: scope.blockedProducts,
    scopeNotes: scope.notes,
  };
}
