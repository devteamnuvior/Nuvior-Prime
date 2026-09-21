/**
 * Central DNC enforcement — CRM DNC always wins over discovery.
 */

import type { CrmInternalAccount } from "@/providers/crm/types";
import type { MatchResult } from "./matching";

export type DncDecision = {
  excluded: boolean;
  reason: string | null;
  /** True when CRM could not be consulted — not proof of safety to contact. */
  crmUnverified: boolean;
  debug: string;
};

/**
 * Apply DNC only from matched CRM truth. Unmatched / unavailable ≠ DNC false proof.
 */
export function evaluateDnc(
  match: MatchResult,
  appliedCrm: CrmInternalAccount | null,
): DncDecision {
  if (match.state === "CRM_UNAVAILABLE") {
    return {
      excluded: false,
      reason: null,
      crmUnverified: true,
      debug: "CRM unavailable — DNC not verified; confirm before outreach",
    };
  }

  if (!appliedCrm) {
    return {
      excluded: false,
      reason: null,
      crmUnverified: match.state !== "NO_MATCH",
      debug:
        match.state === "NO_MATCH"
          ? "No CRM match — DNC unknown (not assumed false)"
          : `Match state ${match.state} — CRM overlay not auto-applied; DNC not verified`,
    };
  }

  if (!appliedCrm.dncVerified) {
    return {
      excluded: false,
      reason: null,
      crmUnverified: true,
      debug: `CRM DNC not verified for ${appliedCrm.crmExternalId} — do not assume safe to contact`,
    };
  }

  if (appliedCrm.doNotContact) {
    return {
      excluded: true,
      reason: "Do-Not-Contact",
      crmUnverified: false,
      debug: `CRM DNC=true for ${appliedCrm.crmExternalId} — excluded from prospect visits`,
    };
  }

  return {
    excluded: false,
    reason: null,
    crmUnverified: false,
    debug: `CRM DNC=false (verified) for ${appliedCrm.crmExternalId}`,
  };
}
