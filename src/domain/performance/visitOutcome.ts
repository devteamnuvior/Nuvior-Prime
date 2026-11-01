/**
 * Structured visit outcomes (performance phase 1).
 *
 * Mirrors the Prisma `VisitOutcome` enum as string literals so domain code and
 * tests stay free of the generated client. Labels are the exact UI wording.
 */

export const VISIT_OUTCOME_CODES = [
  "MET_DECISION_MAKER",
  "INTERESTED",
  "SAMPLE_LEFT",
  "QUOTE_REQUESTED",
  "ORDER_PLACED",
  "ACADEMY_SIGNUP",
  "NOT_INTERESTED",
  "NOT_AVAILABLE",
  "CLOSED_OR_MOVED",
] as const;

export type VisitOutcomeCode = (typeof VISIT_OUTCOME_CODES)[number];

export type VisitOutcomeTone = "neutral" | "primary" | "success" | "warning" | "danger";

export type VisitOutcomeDefinition = {
  code: VisitOutcomeCode;
  label: string;
  /** One-line hint shown under the select in the visit form. */
  hint: string;
  tone: VisitOutcomeTone;
  /** True when the rep actually spoke to someone (counts as a completed visit). */
  contactMade: boolean;
  /** Sort order in selects — most common first. */
  order: number;
};

export const VISIT_OUTCOMES: readonly VisitOutcomeDefinition[] = [
  { code: "INTERESTED", label: "Interested, follow-up agreed", hint: "Decision maker wants a next step.", tone: "success", contactMade: true, order: 1 },
  { code: "MET_DECISION_MAKER", label: "Met decision maker", hint: "Conversation held, no commitment yet.", tone: "primary", contactMade: true, order: 2 },
  { code: "SAMPLE_LEFT", label: "Sample left", hint: "Product sample or literature left on site.", tone: "primary", contactMade: true, order: 3 },
  { code: "QUOTE_REQUESTED", label: "Quote requested", hint: "Clinic asked for pricing.", tone: "success", contactMade: true, order: 4 },
  { code: "ORDER_PLACED", label: "Order placed", hint: "Order taken or confirmed during the visit.", tone: "success", contactMade: true, order: 5 },
  { code: "ACADEMY_SIGNUP", label: "Academy / certification sign-up", hint: "Staff enrolled or committed to NUVIOR Academy training.", tone: "success", contactMade: true, order: 6 },
  { code: "NOT_AVAILABLE", label: "Decision maker not available", hint: "Nobody to talk to — try another time.", tone: "warning", contactMade: false, order: 7 },
  { code: "NOT_INTERESTED", label: "Not interested", hint: "Clear no for now.", tone: "danger", contactMade: true, order: 8 },
  { code: "CLOSED_OR_MOVED", label: "Closed or moved", hint: "Clinic no longer operates at this address.", tone: "neutral", contactMade: false, order: 9 },
];

const BY_CODE: Record<VisitOutcomeCode, VisitOutcomeDefinition> = Object.fromEntries(
  VISIT_OUTCOMES.map((o) => [o.code, o]),
) as Record<VisitOutcomeCode, VisitOutcomeDefinition>;

export function visitOutcomeDefinition(code: VisitOutcomeCode): VisitOutcomeDefinition {
  return BY_CODE[code];
}

export function visitOutcomeLabel(code: string | null | undefined): string | null {
  if (!code || !isVisitOutcomeCode(code)) return null;
  return BY_CODE[code].label;
}

export function isVisitOutcomeCode(value: unknown): value is VisitOutcomeCode {
  return typeof value === "string" && (VISIT_OUTCOME_CODES as readonly string[]).includes(value);
}

/** Fit score at or above this value makes a logged visit a "quality visit". */
export const QUALITY_VISIT_MIN_FIT = 4;

export function isQualityVisit(fitScore: number | null | undefined): boolean {
  return typeof fitScore === "number" && fitScore >= QUALITY_VISIT_MIN_FIT;
}

/**
 * Best-effort mapping of free text (legacy `outcome` notes, LLM-structured notes)
 * to a structured code. Returns null when nothing matches — never guesses.
 * Order matters: stronger commitments are checked first.
 */
const PATTERNS: Array<[VisitOutcomeCode, RegExp]> = [
  ["ORDER_PLACED", /\b(order(ed)?|purchase[ds]?|bought)\b/i],
  ["ACADEMY_SIGNUP", /\b(academy|certif|enrol|training sign|signed up)/i],
  ["QUOTE_REQUESTED", /\b(quote|pricing|price list|proposal)\b/i],
  ["SAMPLE_LEFT", /\b(sample|brochure|literature|left (a )?kit)\b/i],
  ["CLOSED_OR_MOVED", /\b(closed|moved|relocat|out of business|permanently)\b/i],
  ["NOT_AVAILABLE", /\b(not (available|in|present|there)|unavailable|no one|nobody|come back|busy)\b/i],
  ["NOT_INTERESTED", /\b(not interested|declined|no interest|pass(ed)? on)\b/i],
  ["INTERESTED", /\b(interested|follow[- ]?up|next step|call back|demo)\b/i],
  ["MET_DECISION_MAKER", /\b(met|spoke|talked|discussed|owner|director|manager)\b/i],
];

export function inferVisitOutcomeCode(text: string | null | undefined): VisitOutcomeCode | null {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  if (isVisitOutcomeCode(t)) return t;
  for (const [code, re] of PATTERNS) {
    if (re.test(t)) return code;
  }
  return null;
}
