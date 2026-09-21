/**
 * Deterministic public ↔ CRM account matching.
 */

import type { CrmInternalAccount } from "@/providers/crm/types";

export type MatchState =
  | "EXACT"
  | "HIGH_CONFIDENCE"
  | "POSSIBLE"
  | "NO_MATCH"
  | "CONFLICT"
  | "MANUAL_VERIFY"
  | "CRM_UNAVAILABLE";

export type MatchMethod =
  | "verified_mapping"
  | "place_id"
  | "name_postal"
  | "address"
  | "phone"
  | "email_domain"
  | "fuzzy_name"
  | "none";

export type PersistedMapping = {
  crmExternalId: string;
  placeId: string | null;
  normalizedBusinessName: string | null;
  normalizedAddress: string | null;
  matchMethod: MatchMethod;
  matchConfidence: number;
  verified: boolean;
  rejected: boolean;
};

export type PublicMatchInput = {
  placeId: string | null;
  businessName: string;
  streetAddress: string;
  postalCode: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

export type MatchResult = {
  state: MatchState;
  method: MatchMethod;
  confidence: number;
  crmAccount: CrmInternalAccount | null;
  candidates: { crmExternalId: string; confidence: number; method: MatchMethod }[];
  reason: string;
};

export type MatchConfig = {
  autoThreshold: number;
  possibleThreshold: number;
};

export function getMatchConfig(): MatchConfig {
  return {
    autoThreshold: Number(process.env.CRM_MATCH_AUTO_THRESHOLD ?? 0.9),
    possibleThreshold: Number(process.env.CRM_MATCH_POSSIBLE_THRESHOLD ?? 0.6),
  };
}

export function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|clinic|centre|center|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\b(mock|suite|unit|floor|ste)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePostal(p: string): string {
  return p.replace(/\s+/g, "").toUpperCase();
}

function phoneDigits(p: string | null | undefined): string {
  return (p ?? "").replace(/\D/g, "");
}

function domainOf(emailOrUrl: string | null | undefined): string | null {
  if (!emailOrUrl) return null;
  const email = emailOrUrl.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (email) return email[1]!.toLowerCase();
  try {
    return new URL(emailOrUrl.startsWith("http") ? emailOrUrl : `https://${emailOrUrl}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return null;
  }
}

function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s: string) => {
    const g = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      g.set(bg, (g.get(bg) ?? 0) + 1);
    }
    return g;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [k, v] of A) {
    overlap += Math.min(v, B.get(k) ?? 0);
  }
  return (2 * overlap) / (Math.max(a.length - 1, 1) + Math.max(b.length - 1, 1));
}

export function matchPublicToCrm(
  pub: PublicMatchInput,
  crmAccounts: CrmInternalAccount[],
  mappings: PersistedMapping[],
  config: MatchConfig = getMatchConfig(),
  crmUnavailable = false,
): MatchResult {
  if (crmUnavailable) {
    return {
      state: "CRM_UNAVAILABLE",
      method: "none",
      confidence: 0,
      crmAccount: null,
      candidates: [],
      reason: "CRM unavailable — internal status not verified; confirm DNC before visit",
    };
  }

  // 1. Verified persistent mapping by place ID
  if (pub.placeId) {
    const verified = mappings.find(
      (m) => m.verified && !m.rejected && m.placeId === pub.placeId,
    );
    if (verified) {
      const acct = crmAccounts.find((a) => a.crmExternalId === verified.crmExternalId) ?? null;
      return {
        state: "EXACT",
        method: "verified_mapping",
        confidence: 1,
        crmAccount: acct,
        candidates: [
          {
            crmExternalId: verified.crmExternalId,
            confidence: 1,
            method: "verified_mapping",
          },
        ],
        reason: "Verified persistent mapping",
      };
    }
    const rejected = mappings.filter(
      (m) => m.rejected && m.placeId === pub.placeId,
    );
    const rejectedIds = new Set(rejected.map((m) => m.crmExternalId));

    // 2. Place ID exact — detect conflicts (multiple CRM rows same placeId)
    const byPlace = crmAccounts.filter(
      (a) => a.placeId === pub.placeId && !rejectedIds.has(a.crmExternalId),
    );
    if (byPlace.length > 1) {
      return {
        state: "CONFLICT",
        method: "place_id",
        confidence: 0.5,
        crmAccount: null,
        candidates: byPlace.map((a) => ({
          crmExternalId: a.crmExternalId,
          confidence: 0.5,
          method: "place_id" as MatchMethod,
        })),
        reason: "Multiple CRM accounts share this Place ID",
      };
    }
    if (byPlace.length === 1) {
      return {
        state: "EXACT",
        method: "place_id",
        confidence: 1,
        crmAccount: byPlace[0]!,
        candidates: [
          { crmExternalId: byPlace[0]!.crmExternalId, confidence: 1, method: "place_id" },
        ],
        reason: "Exact Google Place ID match",
      };
    }
  }

  const scored: { account: CrmInternalAccount; confidence: number; method: MatchMethod }[] = [];
  const pubName = normalizeBusinessName(pub.businessName);
  const pubPostal = normalizePostal(pub.postalCode);
  const pubAddr = normalizeAddress(pub.streetAddress);
  const pubPhone = phoneDigits(pub.phone);
  const pubDomain = domainOf(pub.email) ?? domainOf(pub.website);

  for (const a of crmAccounts) {
    if (mappings.some((m) => m.rejected && m.crmExternalId === a.crmExternalId && m.placeId === pub.placeId)) {
      continue;
    }

    // name + postal
    if (
      pubPostal &&
      postalNormEq(pubPostal, a.postalCode) &&
      (normalizeBusinessName(a.businessName) === pubName ||
        dice(normalizeBusinessName(a.businessName), pubName) >= 0.9)
    ) {
      scored.push({ account: a, confidence: 0.95, method: "name_postal" });
      continue;
    }

    // address
    if (pubAddr && a.streetAddress && normalizeAddress(a.streetAddress) === pubAddr) {
      scored.push({ account: a, confidence: 0.92, method: "address" });
      continue;
    }

    // phone
    if (pubPhone.length >= 10 && phoneDigits(a.phone) === pubPhone) {
      scored.push({ account: a, confidence: 0.93, method: "phone" });
      continue;
    }

    // email/domain
    if (pubDomain && (domainOf(a.email) === pubDomain || a.websiteDomain === pubDomain)) {
      scored.push({ account: a, confidence: 0.85, method: "email_domain" });
      continue;
    }

    // fuzzy name fallback
    const fuzzy = dice(normalizeBusinessName(a.businessName), pubName);
    if (fuzzy >= config.possibleThreshold) {
      scored.push({ account: a, confidence: fuzzy * 0.75, method: "fuzzy_name" });
    }
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored[0];
  if (!top) {
    return {
      state: "NO_MATCH",
      method: "none",
      confidence: 0,
      crmAccount: null,
      candidates: [],
      reason: "No CRM match",
    };
  }

  // Multiple high scores → conflict
  const close = scored.filter((s) => s.confidence >= config.autoThreshold);
  if (close.length > 1) {
    return {
      state: "CONFLICT",
      method: top.method,
      confidence: top.confidence,
      crmAccount: null,
      candidates: close.map((s) => ({
        crmExternalId: s.account.crmExternalId,
        confidence: s.confidence,
        method: s.method,
      })),
      reason: "Multiple high-confidence CRM candidates",
    };
  }

  if (top.confidence >= config.autoThreshold && top.method !== "fuzzy_name") {
    return {
      state: top.confidence >= 0.98 ? "EXACT" : "HIGH_CONFIDENCE",
      method: top.method,
      confidence: top.confidence,
      crmAccount: top.account,
      candidates: scored.slice(0, 3).map((s) => ({
        crmExternalId: s.account.crmExternalId,
        confidence: s.confidence,
        method: s.method,
      })),
      reason: `Matched via ${top.method}`,
    };
  }

  if (top.confidence >= config.possibleThreshold) {
    return {
      state: "POSSIBLE",
      method: top.method,
      confidence: top.confidence,
      crmAccount: null,
      candidates: scored.slice(0, 3).map((s) => ({
        crmExternalId: s.account.crmExternalId,
        confidence: s.confidence,
        method: s.method,
      })),
      reason: "Possible match — manual verification required",
    };
  }

  return {
    state: "NO_MATCH",
    method: "none",
    confidence: top.confidence,
    crmAccount: null,
    candidates: [],
    reason: "Below match thresholds",
  };
}

function postalNormEq(a: string, b: string | null): boolean {
  return normalizePostal(a) === normalizePostal(b ?? "");
}

export function shouldAutoApplyMatch(result: MatchResult, config: MatchConfig = getMatchConfig()): boolean {
  return (
    (result.state === "EXACT" || result.state === "HIGH_CONFIDENCE") &&
    result.crmAccount != null &&
    result.confidence >= config.autoThreshold &&
    result.method !== "fuzzy_name"
  );
}
