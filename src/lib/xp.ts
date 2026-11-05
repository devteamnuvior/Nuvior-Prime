/**
 * Performance phase 4 — XP ledger, badges and leaderboards.
 * Rules are pure in src/domain/performance/xp.ts; this file only touches Prisma.
 * Awarding is idempotent: PointEvent is unique per (user, reason, source).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  computeStreak,
  dayKey,
  earnedBadges,
  levelFor,
  nextBadges,
  parseDayKey,
  periodRange,
  pointsForVisit,
  rankEntries,
  resolveDailyVisitsTarget,
  STREAK_MILESTONES,
  POINT_RULES,
  type BadgeProgress,
  type BadgeStats,
  type LeaderboardEntry,
  type Level,
  type PointAward,
  type PointReasonCode,
  type RankedEntry,
  type TargetPeriod,
} from "@/domain/performance";
import { listSalesTargets } from "@/lib/performance";

async function writeAwards(userId: string, day: string, provinceCode: string | null, awards: PointAward[]): Promise<number> {
  if (!awards.length) return 0;
  const data: Prisma.PointEventCreateManyInput[] = awards.map((a) => ({
    userId,
    day: parseDayKey(day),
    provinceCode,
    reason: a.reason,
    basePoints: a.basePoints,
    points: a.basePoints,
    sourceType: a.sourceType,
    sourceId: a.sourceId,
  }));
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
    firstVisitToAccountToday: sameDayEarlier === 0,
    earlierOrderOnAccount: earlierOrder > 0,
    pendingFollowUpDueOn: pendingFollowUp?.followUpDate ? dayKey(pendingFollowUp.followUpDate) : null,
  });
  return writeAwards(v.createdByUserId, day, v.account?.provinceCode ?? null, awards);
}

/**
 * Daily target bonus and streak milestones for one rep/day, from RepDailySummary.
 * The target is in clinic slots (ten a day unless an admin set otherwise), so a
 * 90-minute visit counts as two.
 */
export async function awardDailyBonuses(userId: string, day: string): Promise<number> {
  const targets = await listSalesTargets(userId);
  const target = resolveDailyVisitsTarget(targets, day);

  const since = parseDayKey(day);
  since.setUTCDate(since.getUTCDate() - 120);
  const summaries = await prisma.repDailySummary.findMany({
    where: { userId, day: { gte: since, lte: parseDayKey(day) } },
    select: { day: true, visitSlots: true, provinceCode: true },
    orderBy: { day: "asc" },
  });
  const today = summaries.find((s) => dayKey(s.day) === day);
  if (!today || today.visitSlots < target.value) return 0;

  const awards: PointAward[] = [{ reason: "DAILY_TARGET_MET", basePoints: POINT_RULES.DAILY_TARGET_MET.points, sourceType: "Day", sourceId: day }];
  const streak = computeStreak(summaries.map((s) => ({ day: dayKey(s.day), visitSlots: s.visitSlots })), targets, day);
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
  points: number;
  sourceType: string;
  sourceId: string;
};

export async function listPointEvents(userId: string, take = 30): Promise<PointEventRow[]> {
  const rows = await prisma.pointEvent.findMany({
    where: { userId },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    day: dayKey(r.day),
    reason: r.reason as PointReasonCode,
    label: POINT_RULES[r.reason as PointReasonCode]?.label ?? r.reason,
    basePoints: r.basePoints,
    points: r.points,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
  }));
}

export type LeaderboardPeriod = Extract<TargetPeriod, "WEEK" | "MONTH">;

/**
 * Period points per active rep in a province ("*" = everyone), ranked.
 * Visit counts come from RepDailySummary over the same range.
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
    prisma.repDailySummary.groupBy({ by: ["userId"], where: { userId: { in: ids }, day: { gte: start, lte: end } }, _sum: { visits: true } }),
  ]);
  const entries: LeaderboardEntry[] = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName,
    provinceCode: u.provinces.includes("*") ? null : (u.provinces[0] ?? null),
    points: points.find((p) => p.userId === u.id)?._sum.points ?? 0,
    totalXp: totals.find((p) => p.userId === u.id)?._sum.points ?? 0,
    visits: summaries.find((s) => s.userId === u.id)?._sum.visits ?? 0,
  }));
  return { ranked: rankEntries(entries), range };
}
