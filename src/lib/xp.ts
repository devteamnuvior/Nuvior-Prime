/**
 * Performance phase 4 — XP ledger, badges, challenges and leaderboards.
 * Rules are pure in src/domain/performance/xp.ts; this file only touches Prisma.
 * Awarding is idempotent: PointEvent is unique per (user, reason, source).
 */

import { prisma } from "@/lib/prisma";
import type { PointReason, Prisma } from "@prisma/client";
import {
  activeChallenge,
  applyMultiplier,
  challengeState,
  computeStreak,
  dayKey,
  earnedBadges,
  levelFor,
  nextBadges,
  parseDayKey,
  periodRange,
  pointsForVisit,
  rankEntries,
  resolveActiveTarget,
  STREAK_MILESTONES,
  POINT_RULES,
  type BadgeProgress,
  type BadgeStats,
  type ChallengeLike,
  type ChallengeState,
  type LeaderboardEntry,
  type Level,
  type PointAward,
  type PointReasonCode,
  type RankedEntry,
  type TargetPeriod,
} from "@/domain/performance";
import { listSalesTargets } from "@/lib/performance";

export type ChallengeRow = ChallengeLike & {
  description: string | null;
  createdById: string | null;
  createdByName: string | null;
  state: ChallengeState;
};

function toChallengeRow(c: {
  id: string;
  title: string;
  description: string | null;
  reason: PointReason;
  multiplier: number;
  provinceCodes: string[];
  startsOn: Date;
  endsOn: Date;
  createdById: string | null;
  createdBy?: { displayName: string } | null;
}, day: string): ChallengeRow {
  const row = {
    id: c.id,
    title: c.title,
    description: c.description,
    reason: c.reason as PointReasonCode,
    multiplier: c.multiplier,
    provinceCodes: c.provinceCodes,
    startsOn: dayKey(c.startsOn),
    endsOn: dayKey(c.endsOn),
    createdById: c.createdById,
    createdByName: c.createdBy?.displayName ?? null,
  };
  return { ...row, state: challengeState(row, day) };
}

export async function listChallenges(day: string, opts: { includeEnded?: boolean } = {}): Promise<ChallengeRow[]> {
  const rows = await prisma.challenge.findMany({
    where: opts.includeEnded ? {} : { endsOn: { gte: parseDayKey(day) } },
    orderBy: [{ startsOn: "desc" }],
    include: { createdBy: { select: { displayName: true } } },
  });
  return rows.map((r) => toChallengeRow(r, day));
}

async function challengesCovering(day: string): Promise<ChallengeLike[]> {
  const d = parseDayKey(day);
  const rows = await prisma.challenge.findMany({ where: { startsOn: { lte: d }, endsOn: { gte: d } } });
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    reason: c.reason as PointReasonCode,
    multiplier: c.multiplier,
    provinceCodes: c.provinceCodes,
    startsOn: dayKey(c.startsOn),
    endsOn: dayKey(c.endsOn),
  }));
}

async function writeAwards(userId: string, day: string, provinceCode: string | null, awards: PointAward[]): Promise<number> {
  if (!awards.length) return 0;
  const challenges = await challengesCovering(day);
  const data: Prisma.PointEventCreateManyInput[] = awards.map((a) => {
    const ch = activeChallenge(challenges, a.reason, day, provinceCode);
    const multiplier = ch?.multiplier ?? 1;
    return {
      userId,
      day: parseDayKey(day),
      provinceCode,
      reason: a.reason,
      basePoints: a.basePoints,
      multiplier,
      points: applyMultiplier(a.basePoints, multiplier),
      sourceType: a.sourceType,
      sourceId: a.sourceId,
      challengeId: ch?.id ?? null,
    };
  });
  const r = await prisma.pointEvent.createMany({ data, skipDuplicates: true });
  return r.count;
}

/** Award the ledger rows one visit earns. Safe to call again; existing rows are skipped. */
export async function awardPointsForVisit(visitId: string): Promise<number> {
  const v = await prisma.visitRecord.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      createdByUserId: true,
      accountId: true,
      visitDate: true,
      createdAt: true,
      outcomeCode: true,
      fitScoreSnapshot: true,
      account: { select: { provinceCode: true } },
    },
  });
  if (!v || !v.createdByUserId || !v.accountId) return 0;
  const day = dayKey(v.visitDate);

  const [sameDayEarlier, earlierOrder, pendingFollowUp] = await Promise.all([
    prisma.visitRecord.count({
      where: { id: { not: v.id }, createdByUserId: v.createdByUserId, accountId: v.accountId, visitDate: v.visitDate, createdAt: { lt: v.createdAt } },
    }),
    prisma.visitRecord.count({
      where: { id: { not: v.id }, accountId: v.accountId, outcomeCode: "ORDER_PLACED", OR: [{ visitDate: { lt: v.visitDate } }, { visitDate: v.visitDate, createdAt: { lt: v.createdAt } }] },
    }),
    prisma.visitRecord.findFirst({
      where: { id: { not: v.id }, createdByUserId: v.createdByUserId, accountId: v.accountId, visitDate: { lt: v.visitDate }, followUpDate: { not: null } },
      orderBy: { visitDate: "desc" },
      select: { followUpDate: true },
    }),
  ]);

  const awards = pointsForVisit({
    id: v.id,
    day,
    createdDay: dayKey(v.createdAt),
    accountId: v.accountId,
    outcomeCode: v.outcomeCode,
    fitScoreSnapshot: v.fitScoreSnapshot,
    firstVisitToAccountToday: sameDayEarlier === 0,
    earlierOrderOnAccount: earlierOrder > 0,
    pendingFollowUpDueOn: pendingFollowUp?.followUpDate ? dayKey(pendingFollowUp.followUpDate) : null,
  });
  return writeAwards(v.createdByUserId, day, v.account?.provinceCode ?? null, awards);
}

/** Daily target bonus and streak milestones for one rep/day, from RepDailySummary. */
export async function awardDailyBonuses(userId: string, day: string): Promise<number> {
  const targets = await listSalesTargets(userId);
  const target = resolveActiveTarget(targets, "DAY", "VISITS", day);
  if (!target) return 0;

  const since = parseDayKey(day);
  since.setUTCDate(since.getUTCDate() - 120);
  const summaries = await prisma.repDailySummary.findMany({
    where: { userId, day: { gte: since, lte: parseDayKey(day) } },
    select: { day: true, visits: true, provinceCode: true },
    orderBy: { day: "asc" },
  });
  const today = summaries.find((s) => dayKey(s.day) === day);
  if (!today || today.visits < target.value) return 0;

  const awards: PointAward[] = [{ reason: "DAILY_TARGET_MET", basePoints: POINT_RULES.DAILY_TARGET_MET.points, sourceType: "Day", sourceId: day }];
  const streak = computeStreak(summaries.map((s) => ({ day: dayKey(s.day), visits: s.visits })), targets, day);
  if (streak.todayCounted && (STREAK_MILESTONES as readonly number[]).includes(streak.days)) {
    awards.push({ reason: "STREAK_MILESTONE", basePoints: POINT_RULES.STREAK_MILESTONE.points, sourceType: "Streak", sourceId: `${day}:${streak.days}` });
  }
  return writeAwards(userId, day, today.provinceCode, awards);
}

export async function badgeStatsFor(userId: string): Promise<BadgeStats> {
  const [visits, byReason, streakRows, xp] = await Promise.all([
    prisma.visitRecord.count({ where: { createdByUserId: userId, accountId: { not: null } } }),
    prisma.pointEvent.groupBy({ by: ["reason"], where: { userId }, _count: { _all: true } }),
    prisma.pointEvent.findMany({ where: { userId, reason: "STREAK_MILESTONE" }, select: { sourceId: true } }),
    prisma.pointEvent.aggregate({ where: { userId }, _sum: { points: true } }),
  ]);
  const count = (r: PointReasonCode) => byReason.find((b) => b.reason === r)?._count._all ?? 0;
  const longestStreak = streakRows.reduce((m, r) => Math.max(m, Number(r.sourceId.split(":")[1] ?? 0)), 0);
  return {
    visits,
    qualityVisits: count("QUALITY_VISIT"),
    academySignups: count("ACADEMY_SIGNUP"),
    firstOrders: count("FIRST_ORDER"),
    followUpsOnTime: count("FOLLOW_UP_ON_TIME"),
    daysTargetMet: count("DAILY_TARGET_MET"),
    longestStreak,
    totalXp: xp._sum.points ?? 0,
  };
}

/** Insert any badge the rep now qualifies for. Returns the newly earned codes. */
export async function syncBadges(userId: string): Promise<string[]> {
  const stats = await badgeStatsFor(userId);
  const earned = earnedBadges(stats);
  if (!earned.length) return [];
  const existing = new Set((await prisma.userBadge.findMany({ where: { userId }, select: { badgeCode: true } })).map((b) => b.badgeCode));
  const fresh = earned.filter((b) => !existing.has(b.code));
  if (fresh.length) {
    await prisma.userBadge.createMany({
      data: fresh.map((b) => ({ userId, badgeCode: b.code, meta: { value: stats[b.stat] } as Prisma.InputJsonValue })),
      skipDuplicates: true,
    });
  }
  return fresh.map((b) => b.code);
}

/** Everything a visit save should trigger after the daily summary is rebuilt. */
export async function awardAfterVisit(visitId: string, userId: string, day: string): Promise<void> {
  try {
    await awardPointsForVisit(visitId);
    await awardDailyBonuses(userId, day);
    await syncBadges(userId);
  } catch (e) {
    console.warn("[xp] award failed:", e instanceof Error ? e.message : e);
  }
}

export type UserXp = {
  totalXp: number;
  level: Level;
  weekPoints: number;
  monthPoints: number;
  badges: { code: string; earnedAt: string }[];
  nextBadges: BadgeProgress[];
  stats: BadgeStats;
};

export async function getUserXp(userId: string, day: string): Promise<UserXp> {
  const week = periodRange("WEEK", day);
  const month = periodRange("MONTH", day);
  const [stats, weekAgg, monthAgg, badges] = await Promise.all([
    badgeStatsFor(userId),
    prisma.pointEvent.aggregate({ where: { userId, day: { gte: parseDayKey(week.start), lte: parseDayKey(week.end) } }, _sum: { points: true } }),
    prisma.pointEvent.aggregate({ where: { userId, day: { gte: parseDayKey(month.start), lte: parseDayKey(month.end) } }, _sum: { points: true } }),
    prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } }),
  ]);
  return {
    totalXp: stats.totalXp,
    level: levelFor(stats.totalXp),
    weekPoints: weekAgg._sum.points ?? 0,
    monthPoints: monthAgg._sum.points ?? 0,
    badges: badges.map((b) => ({ code: b.badgeCode, earnedAt: b.earnedAt.toISOString() })),
    nextBadges: nextBadges(stats, 2),
    stats,
  };
}

export type PointEventRow = {
  id: string;
  day: string;
  reason: PointReasonCode;
  label: string;
  basePoints: number;
  multiplier: number;
  points: number;
  sourceType: string;
  sourceId: string;
  challengeTitle: string | null;
};

export async function listPointEvents(userId: string, take = 30): Promise<PointEventRow[]> {
  const rows = await prisma.pointEvent.findMany({
    where: { userId },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    take,
    include: { challenge: { select: { title: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    day: dayKey(r.day),
    reason: r.reason as PointReasonCode,
    label: POINT_RULES[r.reason as PointReasonCode]?.label ?? r.reason,
    basePoints: r.basePoints,
    multiplier: r.multiplier,
    points: r.points,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    challengeTitle: r.challenge?.title ?? null,
  }));
}

export type LeaderboardPeriod = Extract<TargetPeriod, "WEEK" | "MONTH">;

/**
 * Period points per active rep in a province ("*" = everyone), ranked.
 * Visits and quality visits come from RepDailySummary over the same range.
 */
export async function getLeaderboard(opts: { period: LeaderboardPeriod; day: string; provinceCode: string }): Promise<{ ranked: RankedEntry[]; range: { start: string; end: string } }> {
  const range = periodRange(opts.period, opts.day);
  const start = parseDayKey(range.start);
  const end = parseDayKey(range.end);
  const users = await prisma.user.findMany({
    where: { role: "REP", status: "ACTIVE", ...(opts.provinceCode === "*" ? {} : { provinces: { has: opts.provinceCode } }) },
    select: { id: true, displayName: true, provinces: true },
  });
  if (!users.length) return { ranked: [], range };
  const ids = users.map((u) => u.id);
  const [points, totals, summaries] = await Promise.all([
    prisma.pointEvent.groupBy({ by: ["userId"], where: { userId: { in: ids }, day: { gte: start, lte: end } }, _sum: { points: true } }),
    prisma.pointEvent.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { points: true } }),
    prisma.repDailySummary.groupBy({ by: ["userId"], where: { userId: { in: ids }, day: { gte: start, lte: end } }, _sum: { visits: true, qualityVisits: true } }),
  ]);
  const entries: LeaderboardEntry[] = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName,
    provinceCode: u.provinces.includes("*") ? null : (u.provinces[0] ?? null),
    points: points.find((p) => p.userId === u.id)?._sum.points ?? 0,
    totalXp: totals.find((p) => p.userId === u.id)?._sum.points ?? 0,
    visits: summaries.find((s) => s.userId === u.id)?._sum.visits ?? 0,
    qualityVisits: summaries.find((s) => s.userId === u.id)?._sum.qualityVisits ?? 0,
  }));
  return { ranked: rankEntries(entries), range };
}

export async function createChallenge(input: {
  title: string;
  description?: string | null;
  reason: PointReasonCode;
  multiplier: number;
  provinceCodes: string[];
  startsOn: string;
  endsOn: string;
  createdById: string;
}): Promise<ChallengeRow> {
  const row = await prisma.challenge.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      reason: input.reason,
      multiplier: input.multiplier,
      provinceCodes: input.provinceCodes,
      startsOn: parseDayKey(input.startsOn),
      endsOn: parseDayKey(input.endsOn),
      createdById: input.createdById,
    },
    include: { createdBy: { select: { displayName: true } } },
  });
  return toChallengeRow(row, dayKey(new Date()));
}

export async function deleteChallenge(id: string): Promise<ChallengeRow | null> {
  const existing = await prisma.challenge.findUnique({ where: { id }, include: { createdBy: { select: { displayName: true } } } });
  if (!existing) return null;
  await prisma.challenge.delete({ where: { id } });
  return toChallengeRow(existing, dayKey(new Date()));
}
