/**
 * Pre-visit clinic brief — structure from spec §09.
 * Phase 1: deterministic template generator (no LLM).
 */

import type { LeadProductCode } from "./terminology";
import { LEAD_PRODUCT_LABELS, SEASON_LABELS } from "./terminology";
import { CANADIAN_PROVINCES } from "./scopeOfPractice";

export const STANDING_QUESTION_BANK = [
  "What are you using for peels and skincare right now, and how are patients responding to it?",
  "What are patients asking for that you don't currently offer?",
  "Who's treating here, and what are they certified in?",
  "Are you doing any thread work, or referring that out?",
  "How's the retail shelf moving? What sells and what sits?",
  "What does your booking look like heading into the next couple of months?",
  "What's the biggest headache with your current supplier: delivery, training, margin, or support?",
  "If we ran a training day here for your team, who would want to be in the room?",
  "When you bring in a new line, who else is involved in that decision?",
  "What would you need to see before trying a new protocol on a patient?",
] as const;

export type SeasonCode = "WINTER" | "SPRING" | "SUMMER" | "AUTUMN";

export type PreVisitBriefPayload = {
  accountId: string;
  accountName: string;
  segmentNumber: number;
  categoryLabel: string;
  visitDate: string;
  provinceCode: string;
  visitType: "first visit" | "re-visit" | "follow-up on a quote";
  lastVisitNotes: string | null;
  season: (typeof SEASON_LABELS)[SeasonCode];
  seasonalPitchOrder: string[];
  provinceUvNote: string;
  snapshotThreeLines: [string, string, string];
  leadProductForVisit: string;
  leadProductWhy: string;
  secondProductIfFirstLands: string;
  openingLines: {
    cold: string;
    knowsNuvior: string;
    revisit: string;
  };
  fiveQuestions: string[];
  signalsToReadOnSite: string[];
  objectionsAndResponses: { objection: string; response: string }[];
  theAsk: string;
  leaveBehind: string;
  doNotSay: string[];
  thinInputWarnings: string[];
  generatedAt: string;
  generator: "template" | "llm" | "llm_fallback";
  /** Phase 5 — non-authoritative short summary */
  accountSummary?: string | null;
  llmMeta?: {
    provider: string;
    model: string | null;
    cacheHit: boolean;
    fallbackReason: string | null;
    safetyWarnings: string[];
    evidenceCount: number;
    accountSummary: string | null;
  } | null;
  /** Stage F — intelligence sections; primary product locked from Stage E when present. */
  clinicIntelligence?: import("./intelligence/clinicIntelligenceDto").BriefIntelligenceSections | null;
};

export function seasonFromDate(date: Date): SeasonCode {
  const month = date.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "WINTER";
  if (month <= 5) return "SPRING";
  if (month <= 8) return "SUMMER";
  return "AUTUMN";
}

/** Spec §09 seasonal pitch order (exact product themes). */
export function seasonalPitchOrder(season: SeasonCode): string[] {
  switch (season) {
    case "WINTER":
      return [
        "Dermaceutic peels and corrective protocols",
        "Aptos threads, recovery happens indoors",
        "Certification dates, clinics are rebuilding volume after the holidays",
      ];
    case "SPRING":
      return [
        "Aptos threads, timed so results land before summer",
        "Dermaceutic brightening and acne protocols",
        "Hy-tissue PRP for hair, spring shedding drives enquiries",
      ];
    case "SUMMER":
      return [
        "GESKE retail, patients buy maintenance and travel devices",
        "Hy-tissue PRP, hair and joint work is not sun-dependent",
        "Autumn certification bookings, schedules are lightest now",
      ];
    case "AUTUMN":
      return [
        "Dermaceutic peels and pigmentation correction",
        "Aptos threads, booked early enough to settle before December",
        "Retail stocking for holiday and Black Friday promotions",
      ];
  }
}

export type BriefAccountContext = {
  accountId: string;
  accountName: string;
  segmentNumber: number;
  categoryLabel: string;
  organizationTypeLabel: string;
  provinceCode: string;
  leadProduct: LeadProductCode;
  openingAngle: string;
  formerMesoesteticCustomer: boolean;
  aptosProductAllowed: boolean;
  serviceMenuSummary: string;
  skincareLines: string;
  practitionersSummary: string;
  pricePositioning: string;
  googleReviewCount: number | null;
  thinPublicData: boolean;
  /** Phase 3 — only include when source-backed */
  enrichedNamedPractitioner?: string | null;
  enrichedServices?: string | null;
  enrichedSkincare?: string | null;
  enrichedThreads?: string | null;
  enrichedPrp?: string | null;
  mesoesteticOnWebsite?: boolean;
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function assertUnder25Words(line: string): string {
  if (wordCount(line) > 25) {
    return line.split(/\s+/).slice(0, 25).join(" ");
  }
  return line;
}

function pickQuestions(ctx: BriefAccountContext): string[] {
  const bank = [...STANDING_QUESTION_BANK];
  // Sequence matters (spec): patients/services before purchasing decisions.
  const preferredIdx =
    ctx.segmentNumber === 2
      ? [1, 2, 3, 5, 6]
      : ctx.segmentNumber >= 5
        ? [0, 4, 5, 6, 8]
        : [0, 1, 2, 3, 7];
  return preferredIdx.map((i) => {
    const q = bank[i]!;
    return q.replace(/\byou\b/g, "your team").includes("your team")
      ? q
      : q;
  });
}

function adjustLeadForSeason(
  lead: LeadProductCode,
  season: SeasonCode,
  ctx: BriefAccountContext,
): { leadLabel: string; why: string; second: string } {
  const order = seasonalPitchOrder(season);
  const leadLabel = LEAD_PRODUCT_LABELS[lead];

  if (ctx.formerMesoesteticCustomer) {
    return {
      leadLabel: LEAD_PRODUCT_LABELS.DERMACEUTIC,
      why: `${SEASON_LABELS[season]}: former Mesoestetic account — lead Dermaceutic as the ongoing line; remaining Mesoestetic stock only while it lasts.`,
      second: order[1] ?? "Aptos threads or certification if scope allows",
    };
  }

  if (!ctx.aptosProductAllowed && lead.startsWith("APTOS") && !lead.includes("CERTIFICATION")) {
    return {
      leadLabel: LEAD_PRODUCT_LABELS.APTOS_3_LEVEL_CERTIFICATION,
      why: "No eligible thread placer confirmed for this province/account — open on certification, not product (spec §09).",
      second: LEAD_PRODUCT_LABELS.DERMACEUTIC,
    };
  }

  return {
    leadLabel,
    why: `${SEASON_LABELS[season]} pitch context: ${order[0]}. Adjusted for this account: ${ctx.openingAngle}`,
    second: order.find((o) => !o.toLowerCase().includes(leadLabel.toLowerCase().split(" ")[0]!)) ?? order[1]!,
  };
}

export function generatePreVisitBrief(params: {
  ctx: BriefAccountContext;
  visitDate: Date;
  visitType: PreVisitBriefPayload["visitType"];
  lastVisitNotes: string | null;
}): PreVisitBriefPayload {
  const { ctx, visitDate, visitType, lastVisitNotes } = params;
  const season = seasonFromDate(visitDate);
  const order = seasonalPitchOrder(season);
  const province = CANADIAN_PROVINCES.find((p) => p.code === ctx.provinceCode);
  const adjusted = adjustLeadForSeason(ctx.leadProduct, season, ctx);

  const thinInputWarnings: string[] = [];
  if (ctx.thinPublicData) {
    thinInputWarnings.push(
      "Confirm who performs injectables and whether a physician or NP is on site.",
    );
  }
  if (!ctx.enrichedNamedPractitioner || ctx.practitionersSummary === "UNKNOWN, verify") {
    thinInputWarnings.push("Confirm practitioners and credentials in the first two minutes on site.");
  }
  if (!ctx.enrichedServices || ctx.serviceMenuSummary === "UNKNOWN, verify") {
    thinInputWarnings.push("Service menu unknown — ask what patients request that they do not offer.");
  }
  if (!ctx.enrichedThreads) {
    thinInputWarnings.push("Confirm whether they do thread work in-house or refer out.");
  }
  if (ctx.mesoesteticOnWebsite) {
    thinInputWarnings.push(
      "Website mentions Mesoestetic/Cosmelan — retention/competitive signal only; do not pitch Mesoestetic as ongoing line.",
    );
  }

  const doNotSay = [
    "Never promise or imply future Mesoestetic supply; remaining stock only while it lasts, Dermaceutic is the ongoing line.",
    "Keep product statements within Health Canada approved indications; use can/may/results vary — never will/guaranteed/permanent/cures.",
    "Do not reference any patient, and do not use another clinic's or doctor's name as a credential or example.",
  ];

  if (!ctx.aptosProductAllowed) {
    doNotSay.push("Do not open on thread product placement if no eligible practitioner works here — certification only.");
  }

  const decisionLine = ctx.enrichedNamedPractitioner
    ? `Named publicly: ${ctx.enrichedNamedPractitioner} — confirm buying decision on site.`
    : `Likely buying decision: medical director / owner for clinical lines; manager for retail — confirm on site.`;

  const visibleBits = [
    ctx.enrichedServices ? `services: ${ctx.enrichedServices}` : null,
    ctx.enrichedSkincare ? `skincare: ${ctx.enrichedSkincare}` : `skincare: ${ctx.skincareLines}`,
    ctx.enrichedThreads ? `threads: ${ctx.enrichedThreads}` : null,
    ctx.enrichedPrp ? `PRP: ${ctx.enrichedPrp}` : null,
    `practitioners: ${ctx.practitionersSummary}`,
    `positioning: ${ctx.pricePositioning}`,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    accountId: ctx.accountId,
    accountName: ctx.accountName,
    segmentNumber: ctx.segmentNumber,
    categoryLabel: ctx.categoryLabel,
    visitDate: visitDate.toISOString().slice(0, 10),
    provinceCode: ctx.provinceCode,
    visitType,
    lastVisitNotes,
    season: SEASON_LABELS[season],
    seasonalPitchOrder: order,
    provinceUvNote: province?.uvSeasonNote ?? "",
    snapshotThreeLines: [
      `${ctx.accountName} — Segment ${ctx.segmentNumber}: ${ctx.categoryLabel} (${ctx.organizationTypeLabel}).`,
      decisionLine,
      `Already visible (source-backed where noted): ${visibleBits}.`,
    ],
    leadProductForVisit: adjusted.leadLabel,
    leadProductWhy: adjusted.why,
    secondProductIfFirstLands: adjusted.second,
    openingLines: {
      cold: assertUnder25Words(
        `I cover aesthetic clinics in ${ctx.provinceCode} and wanted to introduce NUVIOR's Health Canada–licensed portfolio.`,
      ),
      knowsNuvior: assertUnder25Words(
        `Following up from academy.nuvior.com / prior NUVIOR contact — quick check on ${adjusted.leadLabel} fit this season.`,
      ),
      revisit: assertUnder25Words(
        lastVisitNotes
          ? `Last time we spoke about ${lastVisitNotes.slice(0, 80)} — I brought the next step we discussed.`
          : `Good to see you again — I came with one focused update for this month.`,
      ),
    },
    fiveQuestions: pickQuestions(ctx),
    signalsToReadOnSite: [
      "Retail shelf brands (peel/cosmeceutical lines)",
      "Device manufacturer plaques on lasers/RF/microneedling",
      "Poster and brochure branding in waiting room",
      "Staff credentials on badges",
      "Before and after displays (thread/peel/PRP themes)",
    ],
    objectionsAndResponses: [
      {
        objection: "We're happy with our current peel supplier.",
        response:
          "Understood — worth comparing protocol support and margin without asking you to rip anything out on day one.",
      },
      {
        objection: "We used Mesoestetic with you before.",
        response:
          "Remaining stock is available while it lasts; Dermaceutic is the ongoing clinical line we can plan around.",
      },
      {
        objection: "We don't have time for another training.",
        response:
          "We can match the Aptos pathway window to your schedule — one specific date is enough to start.",
      },
    ],
    theAsk:
      adjusted.leadLabel.toLowerCase().includes("certification")
        ? "Book a training-date conversation with the eligible injectors this week."
        : `Leave a ${adjusted.leadLabel} sample protocol / demo booking request with the decision maker.`,
    leaveBehind: `One-pager for ${adjusted.leadLabel} within Health Canada approved indications; no Mesoestetic future-supply claims.`,
    doNotSay,
    thinInputWarnings,
    generatedAt: new Date().toISOString(),
    generator: "template",
    accountSummary: null,
    llmMeta: null,
  };
}
