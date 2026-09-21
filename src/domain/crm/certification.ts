/**
 * Certification handling from CRM — do not infer completed cert from public credentials.
 */

import type { CertificationPathwayCode } from "@/domain/terminology";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";

export function pathwayFromCredentials(
  provinceCode: string,
  credentials: AccountCredentialSignals,
): CertificationPathwayCode {
  if (credentials.hasPhysicianOrNp) return "THREE_LEVEL";
  if (
    credentials.hasRn ||
    credentials.hasImg ||
    credentials.hasAllied ||
    (provinceCode === "BC" && credentials.hasNd)
  ) {
    return "FOUR_LEVEL";
  }
  return "NONE";
}

/**
 * Prefer CRM pathway when set; never downgrade an explicit CRM pathway to NONE
 * based on incomplete public credentials alone when CRM says otherwise.
 */
export function resolvePathway(opts: {
  crmPathway: CertificationPathwayCode | null | undefined;
  derivedPathway: CertificationPathwayCode;
}): CertificationPathwayCode {
  if (opts.crmPathway && opts.crmPathway !== "NONE") return opts.crmPathway;
  return opts.derivedPathway;
}

export function isFullyCertified(level: string | null | undefined): boolean {
  if (!level) return false;
  const l = level.toLowerCase();
  if (/3\/3/.test(l) || /4\/4/.test(l)) return true;
  return /fully certified|certification complete/.test(l);
}

export function hasPartialCertification(level: string | null | undefined): boolean {
  if (!level) return false;
  return /\d\/\d/.test(level) && !isFullyCertified(level);
}

/**
 * Opening-angle hint for next certification step — CRM level only.
 */
export function nextCertificationHint(
  pathway: CertificationPathwayCode,
  level: string | null | undefined,
): string | null {
  if (!level) return null;
  if (isFullyCertified(level)) {
    return `CRM cert ${level} complete — open on product / advanced techniques, not lower pathway.`;
  }
  if (hasPartialCertification(level)) {
    return `CRM cert progress ${level} (${pathway === "FOUR_LEVEL" ? "4-level" : "3-level"}) — continue next module; do not recommend a lower pathway.`;
  }
  return `CRM cert level: ${level}`;
}
