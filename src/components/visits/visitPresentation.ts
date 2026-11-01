import { VISIT_OUTCOMES, type VisitOutcomeTone } from "@/domain/performance/visitOutcome";

export type PlannedRouteRow = {
  id: string;
  createdAt: string;
  provinceCode: string;
  stopCount: number;
  dailyVisitTarget: number;
  startQuery: string;
  totalDriveMinutes: number | null;
  dayStartClock: string | null;
};

export type LoggedVisitRow = {
  id: string;
  visitDate: string;
  accountName: string;
  city: string | null;
  visitType: string;
  outcomeCode: string | null;
  outcomeLabel: string | null;
  fitScore: number | null;
  nextAction: string | null;
};

export const VISIT_TYPE_LABEL: Record<string, string> = {
  FIRST_VISIT: "First visit",
  RE_VISIT: "Re-visit",
  FOLLOW_UP_ON_A_QUOTE: "Quote follow-up",
};

export const OUTCOME_TONE: Record<string, VisitOutcomeTone> = Object.fromEntries(VISIT_OUTCOMES.map((o) => [o.code, o.tone]));

/** Four buckets for the outcome filter and the breakdown bar. */
export type OutcomeBucket = "won" | "progress" | "no_contact" | "lost";

export const OUTCOME_BUCKETS: { key: OutcomeBucket; label: string; color: string; tones: VisitOutcomeTone[] }[] = [
  { key: "won", label: "Positive", color: "success.main", tones: ["success"] },
  { key: "progress", label: "In progress", color: "primary.main", tones: ["primary"] },
  { key: "no_contact", label: "No contact", color: "warning.main", tones: ["warning", "neutral"] },
  { key: "lost", label: "Not interested", color: "error.main", tones: ["danger"] },
];

export function outcomeBucket(code: string | null): OutcomeBucket | null {
  if (!code) return null;
  const tone = OUTCOME_TONE[code];
  return OUTCOME_BUCKETS.find((b) => b.tones.includes(tone))?.key ?? null;
}
