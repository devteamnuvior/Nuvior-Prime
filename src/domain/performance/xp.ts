/**
 * Competition layer (performance phase 4) — pure rules for XP, levels,
 * badges and ranking. Persistence lives in src/lib/xp.ts.
 *
 * Design rules:
 * - Points reward quality and follow-through, never raw volume: a fit-4+
 *   visit is worth 2.5× a low-fit one, and strategic outcomes (academy,
 *   first order) dwarf both.
 * - Every point is a ledger row tied to a source, so totals are auditable.
 * - A DNC account never earns points (such visits must not exist; callers
 *   skip them).
 */

import { isQualityVisit, type VisitOutcomeCode } from "./visitOutcome";

export const POINT_REASONS = [
  "VISIT",
  "QUALITY_VISIT",
  "OUTCOME_SAME_DAY",
  "FOLLOW_UP_ON_TIME",
  "ACADEMY_SIGNUP",
  "FIRST_ORDER",
  "DAILY_TARGET_MET",
  "STREAK_MILESTONE",
] as const;
export type PointReasonCode = (typeof POINT_REASONS)[number];

export const POINT_RULES: Record<PointReasonCode, { points: number; label: string; description: string }> = {
  VISIT: { points: 8, label: "Visit logged", description: "A logged visit to a clinic with fit 1–3." },
  QUALITY_VISIT: { points: 20, label: "Quality visit", description: "A logged visit to a clinic with fit 4 or 5." },
  OUTCOME_SAME_DAY: { points: 5, label: "Outcome logged same day", description: "Structured outcome recorded on the visit day." },
  FOLLOW_UP_ON_TIME: { points: 10, label: "Follow-up on time", description: "Returned to a clinic on or before the follow-up date you set." },
  ACADEMY_SIGNUP: { points: 40, label: "Academy sign-up", description: "Clinic staff enrolled in NUVIOR Academy or an Aptos pathway." },
  FIRST_ORDER: { points: 60, label: "First order", description: "First order from an account you opened." },
  DAILY_TARGET_MET: { points: 15, label: "Daily target met", description: "Hit the daily clinic target (ten 45-minute slots)." },
  STREAK_MILESTONE: { points: 25, label: "Streak milestone", description: "5, 10, 20 or 50 working days on target in a row." },
};

export const STREAK_MILESTONES = [5, 10, 20, 50] as const;

export type VisitPointInput = {
  id: string;
  /** YYYY-MM-DD of the visit */
  day: string;
  /** YYYY-MM-DD the record was created */
  createdDay: string;
  accountId: string | null;
  outcomeCode: VisitOutcomeCode | string | null;
  fitScoreSnapshot: number | null;
  /** False when the same rep already logged this account on this day (anti-gaming). */
  firstVisitToAccountToday: boolean;
  /** True when any earlier visit to this account recorded ORDER_PLACED. */
  earlierOrderOnAccount: boolean;
  /** Due date of a follow-up set by an earlier visit to this account that was still open on this day. */
  pendingFollowUpDueOn: string | null;
};

export type PointAward = { reason: PointReasonCode; basePoints: number; sourceType: "VisitRecord" | "Day" | "Streak"; sourceId: string };

/** Awards for one logged visit. Empty when the visit should not earn anything. */
export function pointsForVisit(v: VisitPointInput): PointAward[] {
  if (!v.accountId || !v.firstVisitToAccountToday) return [];
  const awards: PointAward[] = [];
  const src = { sourceType: "VisitRecord" as const, sourceId: v.id };

  if (isQualityVisit(v.fitScoreSnapshot)) awards.push({ reason: "QUALITY_VISIT", basePoints: POINT_RULES.QUALITY_VISIT.points, ...src });
  else awards.push({ reason: "VISIT", basePoints: POINT_RULES.VISIT.points, ...src });

  if (v.outcomeCode && v.createdDay === v.day) awards.push({ reason: "OUTCOME_SAME_DAY", basePoints: POINT_RULES.OUTCOME_SAME_DAY.points, ...src });
  if (v.pendingFollowUpDueOn && v.day <= v.pendingFollowUpDueOn) awards.push({ reason: "FOLLOW_UP_ON_TIME", basePoints: POINT_RULES.FOLLOW_UP_ON_TIME.points, ...src });
  if (v.outcomeCode === "ACADEMY_SIGNUP") awards.push({ reason: "ACADEMY_SIGNUP", basePoints: POINT_RULES.ACADEMY_SIGNUP.points, ...src });
  if (v.outcomeCode === "ORDER_PLACED" && !v.earlierOrderOnAccount) awards.push({ reason: "FIRST_ORDER", basePoints: POINT_RULES.FIRST_ORDER.points, ...src });
  return awards;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const LEVELS = [
  { code: "ASSOCIATE", name: "Associate", min: 0 },
  { code: "SPECIALIST", name: "Specialist", min: 500 },
  { code: "SENIOR", name: "Senior", min: 1500 },
  { code: "ELITE", name: "Elite", min: 3500 },
  { code: "MASTER", name: "Master", min: 7000 },
] as const;

export type Level = {
  index: number;
  code: (typeof LEVELS)[number]["code"];
  name: string;
  min: number;
  /** XP needed for the next level, null at the top. */
  next: number | null;
  nextName: string | null;
  toNext: number | null;
  /** 0–100 through the current level. */
  progress: number;
};

export function levelFor(xp: number): Level {
  const total = Math.max(0, xp);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i].min) index = i;
  const cur = LEVELS[index];
  const nxt = LEVELS[index + 1] ?? null;
  const span = nxt ? nxt.min - cur.min : 1;
  return {
    index,
    code: cur.code,
    name: cur.name,
    min: cur.min,
    next: nxt?.min ?? null,
    nextName: nxt?.name ?? null,
    toNext: nxt ? nxt.min - total : null,
    progress: nxt ? Math.min(100, Math.round(((total - cur.min) / span) * 100)) : 100,
  };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export type BadgeStats = {
  visits: number;
  qualityVisits: number;
  academySignups: number;
  firstOrders: number;
  followUpsOnTime: number;
  daysTargetMet: number;
  longestStreak: number;
  totalXp: number;
};

export type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  stat: keyof BadgeStats;
  threshold: number;
  /** MUI icon key resolved by the UI. */
  icon: "route" | "school" | "star" | "bolt" | "cart" | "repeat" | "trophy" | "flag";
};

export const BADGES: readonly BadgeDefinition[] = [
  { code: "FIRST_STEPS", name: "First steps", description: "10 logged visits.", stat: "visits", threshold: 10, icon: "flag" },
  { code: "CENTURY", name: "Century", description: "100 logged visits.", stat: "visits", threshold: 100, icon: "trophy" },
  { code: "QUALITY_FOCUS", name: "Quality focus", description: "50 visits to fit-4+ clinics.", stat: "qualityVisits", threshold: 50, icon: "star" },
  { code: "ROUTE_MASTER", name: "Route master", description: "10 days on the daily target.", stat: "daysTargetMet", threshold: 10, icon: "route" },
  { code: "STREAK_5", name: "On a roll", description: "5 working days on target in a row.", stat: "longestStreak", threshold: 5, icon: "bolt" },
  { code: "STREAK_20", name: "Unstoppable", description: "20 working days on target in a row.", stat: "longestStreak", threshold: 20, icon: "bolt" },
  { code: "ACADEMY_BUILDER", name: "Academy builder", description: "5 Academy sign-ups.", stat: "academySignups", threshold: 5, icon: "school" },
  { code: "OPENER", name: "Opener", description: "First order from an account you opened.", stat: "firstOrders", threshold: 1, icon: "cart" },
  { code: "CLOSER", name: "Closer", description: "10 first orders.", stat: "firstOrders", threshold: 10, icon: "cart" },
  { code: "FOLLOW_THROUGH", name: "Follow-through", description: "25 follow-ups on time.", stat: "followUpsOnTime", threshold: 25, icon: "repeat" },
];

export function earnedBadges(stats: BadgeStats): BadgeDefinition[] {
  return BADGES.filter((b) => stats[b.stat] >= b.threshold);
}

export type BadgeProgress = BadgeDefinition & { value: number; percent: number };

/** The closest unearned badges, best progress first. */
export function nextBadges(stats: BadgeStats, limit = 2): BadgeProgress[] {
  return BADGES.filter((b) => stats[b.stat] < b.threshold)
    .map((b) => ({ ...b, value: stats[b.stat], percent: Math.min(99, Math.round((stats[b.stat] / b.threshold) * 100)) }))
    .sort((a, b) => b.percent - a.percent || a.threshold - b.threshold)
    .slice(0, limit);
}

export function badgeDefinition(code: string): BadgeDefinition | null {
  return BADGES.find((b) => b.code === code) ?? null;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  provinceCode: string | null;
  points: number;
  visits: number;
  qualityVisits: number;
  totalXp: number;
};

export type RankedEntry = LeaderboardEntry & { rank: number };

/** Sort by period points, then quality visits, then name. Ties share a rank (1, 1, 3). */
export function rankEntries(entries: readonly LeaderboardEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => b.points - a.points || b.qualityVisits - a.qualityVisits || a.displayName.localeCompare(b.displayName));
  const out: RankedEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = out[i - 1];
    const rank = prev && prev.points === sorted[i].points && prev.qualityVisits === sorted[i].qualityVisits ? prev.rank : i + 1;
    out.push({ ...sorted[i], rank });
  }
  return out;
}

export type LeaderboardView = {
  /** Rows the viewer may see: the whole list, or top 3 plus a window around them. */
  rows: RankedEntry[];
  me: RankedEntry | null;
  /** Points separating the viewer from first place; 0 when leading or absent. */
  toFirst: number;
  /** True when rows were trimmed for a rep's view. */
  trimmed: boolean;
};

export function leaderboardView(ranked: readonly RankedEntry[], meId: string | null, full: boolean, around = 2): LeaderboardView {
  const me = ranked.find((r) => r.userId === meId) ?? null;
  const toFirst = me && ranked.length ? Math.max(0, ranked[0].points - me.points) : 0;
  if (full || !me) return { rows: [...ranked], me, toFirst, trimmed: false };
  const idx = ranked.indexOf(me);
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(3, ranked.length); i++) keep.add(i);
  for (let i = Math.max(0, idx - around); i <= Math.min(ranked.length - 1, idx + around); i++) keep.add(i);
  const rows = ranked.filter((_, i) => keep.has(i));
  return { rows, me, toFirst, trimmed: rows.length < ranked.length };
}
