/**
 * Province scope-of-practice rules from NUVIOR_PRIME_SPEC.md §05.
 *
 * ASSUMPTION (A4/A5 in IMPLEMENTATION_PLAN): Spec gives principles, not a full
 * legal matrix. Non-BC provinces mark ND as not eligible for threads. RN thread
 * placement treated as requiring physician order/directive (not assumed present
 * unless people data shows physician/NP on site).
 */

export type ProvinceInfo = {
  code: string;
  name: string;
  /** Spec §09: prairies/north longer low-UV; coastal BC shorter. */
  uvSeasonNote: string;
};

export const CANADIAN_PROVINCES: ProvinceInfo[] = [
  { code: "AB", name: "Alberta", uvSeasonNote: "Prairies: longer low-UV window than coastal BC." },
  { code: "BC", name: "British Columbia", uvSeasonNote: "Coastal British Columbia: shorter low-UV window." },
  { code: "MB", name: "Manitoba", uvSeasonNote: "Prairies: longer low-UV window than coastal BC." },
  { code: "NB", name: "New Brunswick", uvSeasonNote: "Follow standard seasonal pitch order unless local UV differs." },
  { code: "NL", name: "Newfoundland and Labrador", uvSeasonNote: "North/Atlantic: treat as longer low-UV window where relevant." },
  { code: "NS", name: "Nova Scotia", uvSeasonNote: "Follow standard seasonal pitch order unless local UV differs." },
  { code: "NT", name: "Northwest Territories", uvSeasonNote: "North: longer low-UV window." },
  { code: "NU", name: "Nunavut", uvSeasonNote: "North: longer low-UV window." },
  { code: "ON", name: "Ontario", uvSeasonNote: "Follow standard seasonal pitch order unless local UV differs." },
  { code: "PE", name: "Prince Edward Island", uvSeasonNote: "Follow standard seasonal pitch order unless local UV differs." },
  { code: "QC", name: "Quebec", uvSeasonNote: "Follow standard seasonal pitch order unless local UV differs." },
  { code: "SK", name: "Saskatchewan", uvSeasonNote: "Prairies: longer low-UV window than coastal BC." },
  { code: "YT", name: "Yukon", uvSeasonNote: "North: longer low-UV window." },
];

export type CredentialCode =
  | "MD"
  | "NP"
  | "RN_UNDER_DIRECTIVE"
  | "ND"
  | "IMG"
  | "ALLIED";

export type ScopeRuleSeed = {
  provinceCode: string;
  provinceName: string;
  productCode: "APTOS" | "FIDIA_HY_TISSUE_PRP";
  eligibleCredentials: CredentialCode[];
  notes: string;
  uvSeasonNote: string;
};

function uvFor(code: string): string {
  return CANADIAN_PROVINCES.find((p) => p.code === code)?.uvSeasonNote ?? "";
}

function nameFor(code: string): string {
  return CANADIAN_PROVINCES.find((p) => p.code === code)?.name ?? code;
}

/** Build Aptos + Fidia rules for every province from §05 principles. */
export function buildProvinceScopeRules(): ScopeRuleSeed[] {
  const rules: ScopeRuleSeed[] = [];

  for (const p of CANADIAN_PROVINCES) {
    const aptosCredentials: CredentialCode[] =
      p.code === "BC"
        ? ["MD", "NP", "RN_UNDER_DIRECTIVE", "ND", "IMG", "ALLIED"]
        : ["MD", "NP", "RN_UNDER_DIRECTIVE"];

    rules.push({
      provinceCode: p.code,
      provinceName: nameFor(p.code),
      productCode: "APTOS",
      eligibleCredentials: aptosCredentials,
      notes:
        p.code === "BC"
          ? "Threads: physicians and NPs; RNs generally under physician order/directive; NDs in BC where injection scope exists; IMGs and allied per Aptos 4-level policy (BC)."
          : "Threads: physicians and NPs everywhere; RNs generally only under a physician's order or directive; naturopathic doctors not in most provinces outside BC.",
      uvSeasonNote: uvFor(p.code),
    });

    rules.push({
      provinceCode: p.code,
      provinceName: nameFor(p.code),
      productCode: "FIDIA_HY_TISSUE_PRP",
      eligibleCredentials: ["MD", "NP"],
      notes:
        "Hy-tissue PRP requires a practitioner licensed to draw blood and inject. Physiotherapists, chiropractors, kinesiologists and massage therapists cannot. Only include multidisciplinary clinics where a physician or NP is on site.",
      uvSeasonNote: uvFor(p.code),
    });
  }

  return rules;
}

export type AccountCredentialSignals = {
  hasPhysicianOrNp: boolean;
  hasRn: boolean;
  hasNd: boolean;
  hasImg: boolean;
  hasAllied: boolean;
  physicianOrNpOnSiteForPrp: boolean;
  /** Explicit evidence of physician directive for RN thread work. Default false (unknown ≠ present). */
  rnHasPhysicianDirective: boolean;
};

export type ScopeEvaluation = {
  aptosProductAllowed: boolean;
  aptosCertificationLeadOk: boolean;
  fidiaAllowed: boolean;
  skincareAllowed: boolean;
  blockedProducts: string[];
  notes: string[];
};

export function evaluateScopeOfPractice(
  provinceCode: string,
  signals: AccountCredentialSignals,
): ScopeEvaluation {
  const notes: string[] = [];
  const blocked: string[] = [];

  const aptosRule = buildProvinceScopeRules().find(
    (r) => r.provinceCode === provinceCode && r.productCode === "APTOS",
  );

  let aptosProductAllowed = false;
  if (signals.hasPhysicianOrNp) {
    aptosProductAllowed = true;
  } else if (signals.hasRn && signals.rnHasPhysicianDirective) {
    aptosProductAllowed = true;
    notes.push("RN thread placement assumed only under documented physician order/directive.");
  } else if (provinceCode === "BC" && signals.hasNd) {
    aptosProductAllowed = true;
    notes.push("BC: ND may be in scope for threads where injection scope exists — confirm before visit.");
  } else if (provinceCode === "BC" && (signals.hasImg || signals.hasAllied)) {
    aptosProductAllowed = false;
    notes.push("BC IMG/allied: confirm Aptos policy eligibility; prefer certification conversation if unclear.");
  }

  if (!aptosProductAllowed) {
    blocked.push("APTOS");
  }

  const aptosCertificationLeadOk =
    signals.hasPhysicianOrNp ||
    signals.hasRn ||
    (provinceCode === "BC" && (signals.hasNd || signals.hasImg || signals.hasAllied));

  const fidiaAllowed = signals.physicianOrNpOnSiteForPrp || signals.hasPhysicianOrNp;
  if (!fidiaAllowed) {
    blocked.push("FIDIA_HY_TISSUE_PRP");
    notes.push(
      "PRP blocked unless physician or NP on site (PTs, chiros, kinesiologists, massage therapists cannot).",
    );
  }

  // Dermaceutic / GESKE — no injection restriction (spec §05)
  const skincareAllowed = true;

  if (aptosRule) {
    notes.push(aptosRule.notes);
  }

  return {
    aptosProductAllowed,
    aptosCertificationLeadOk,
    fidiaAllowed,
    skincareAllowed,
    blockedProducts: blocked,
    notes,
  };
}
