/**
 * Map enrichment facts → qualification credential / clinical signals.
 * Only explicit VERIFIED_SOURCE / clear facts — never invent.
 */

import type { EnrichmentResult } from "@/domain/enrichment/types";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import { UNKNOWN_VERIFY } from "@/domain/terminology";

export type EnrichmentQualificationSignals = {
  credentials: Partial<AccountCredentialSignals>;
  advertisesThreadLifting: boolean | null;
  injectablesOffered: string | null;
  threadsOffered: string | null;
  skincareLines: string | null;
  /** For briefs only — never sets formerMesoesteticCustomer CRM flag */
  mesoesteticMentioned: boolean;
  practitionersSummary: string | null;
  serviceMenuSummary: string | null;
  onlineBookingUrl: string | null;
  generalEmail: string | null;
};

export function signalsFromEnrichment(result: EnrichmentResult | null): EnrichmentQualificationSignals {
  if (!result || result.skipped) {
    return {
      credentials: {},
      advertisesThreadLifting: null,
      injectablesOffered: null,
      threadsOffered: null,
      skincareLines: null,
      mesoesteticMentioned: false,
      practitionersSummary: null,
      serviceMenuSummary: null,
      onlineBookingUrl: null,
      generalEmail: null,
    };
  }

  const facts = result.facts;
  const hasMd = facts.people.some((p) => p.credentials === "MD");
  const hasNp = facts.people.some((p) => p.credentials === "NP");
  const hasRn = facts.people.some((p) => p.credentials === "RN" || p.credentials === "RPN");
  const hasNd = facts.people.some((p) => p.credentials === "ND");

  return {
    credentials: {
      hasPhysicianOrNp: hasMd || hasNp ? true : undefined,
      hasRn: hasRn ? true : undefined,
      hasNd: hasNd ? true : undefined,
      physicianOrNpOnSiteForPrp: hasMd || hasNp ? true : undefined,
    },
    advertisesThreadLifting: facts.advertisesThreadLifting,
    injectablesOffered: facts.injectablesOffered,
    threadsOffered: facts.threadsOffered,
    skincareLines: facts.skincareLines,
    mesoesteticMentioned: facts.mesoesteticMentioned,
    practitionersSummary:
      facts.people.length > 0
        ? facts.people.map((p) => `${p.name}, ${p.credentials} (${p.role})`).join("; ")
        : null,
    serviceMenuSummary: facts.serviceMenuSummary,
    onlineBookingUrl: facts.onlineBookingUrl,
    generalEmail: facts.generalEmail,
  };
}

export function mergeCredentials(
  base: AccountCredentialSignals,
  partial: Partial<AccountCredentialSignals>,
): AccountCredentialSignals {
  return {
    hasPhysicianOrNp: partial.hasPhysicianOrNp ?? base.hasPhysicianOrNp,
    hasRn: partial.hasRn ?? base.hasRn,
    hasNd: partial.hasNd ?? base.hasNd,
    hasImg: partial.hasImg ?? base.hasImg,
    hasAllied: partial.hasAllied ?? base.hasAllied,
    physicianOrNpOnSiteForPrp:
      partial.physicianOrNpOnSiteForPrp ?? base.physicianOrNpOnSiteForPrp,
    rnHasPhysicianDirective: partial.rnHasPhysicianDirective ?? base.rnHasPhysicianDirective,
  };
}

export function preferEnriched(enriched: string | null, fallback: string): string {
  if (enriched && enriched.trim() && !enriched.includes("UNKNOWN")) return enriched;
  return fallback || UNKNOWN_VERIFY;
}
