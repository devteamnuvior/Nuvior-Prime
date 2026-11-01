import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { hasPermission } from "@/domain/auth/permissions";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { dayKey, leaderboardView } from "@/domain/performance";
import { getLeaderboard, getUserXp, listChallenges, type LeaderboardPeriod } from "@/lib/xp";
import { PageContainer } from "@/components/layout/PageContainer";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; province?: string }> }) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "performance.view.own");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const sp = await searchParams;
  const period: LeaderboardPeriod = sp.period === "month" ? "MONTH" : "WEEK";
  const today = dayKey(new Date());
  const full = hasPermission(user.role, "performance.view.team");
  const canManage = hasPermission(user.role, "target.manage");

  // Which provinces the viewer may browse: reps their own, managers theirs, admins all (+ national).
  const allCodes = CANADIAN_PROVINCES.map((p) => p.code);
  const allowed = user.provinces.includes("*") ? ["*", ...allCodes] : user.provinces;
  const requested = sp.province && allowed.includes(sp.province) ? sp.province : null;
  const provinceCode = requested ?? (user.provinces.includes("*") ? "*" : (user.provinces[0] ?? "*"));

  const [{ ranked, range }, challenges, me] = await Promise.all([
    getLeaderboard({ period, day: today, provinceCode }),
    listChallenges(today),
    getUserXp(user.id, today),
  ]);
  const view = leaderboardView(ranked, user.id, full);

  return (
    <PageContainer>
      <LeaderboardView
        period={period}
        provinceCode={provinceCode}
        provinceOptions={allowed.map((c) => ({ code: c, name: c === "*" ? "All provinces" : (CANADIAN_PROVINCES.find((p) => p.code === c)?.name ?? c) }))}
        range={range}
        rows={view.rows}
        me={view.me}
        toFirst={view.toFirst}
        trimmed={view.trimmed}
        totalRanked={ranked.length}
        myXp={me}
        viewerId={user.id}
        viewerProvinces={user.provinces}
        challenges={challenges}
        canManage={canManage}
        today={today}
      />
    </PageContainer>
  );
}
