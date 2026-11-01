import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/domain/auth/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import { VisitsView, type LoggedVisitRow, type PlannedRouteRow } from "@/components/visits/VisitsView";
import { TargetProgressStrip } from "@/components/visits/TargetProgressStrip";
import { getTargetProgress } from "@/lib/performance";
import { dayKey, visitOutcomeLabel } from "@/domain/performance";

export default async function MyVisitsPage() {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "visit.view.own");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const runs = await prisma.visitListRun.findMany({
    where: { createdByUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { items: true } } },
  });
  const visits = await prisma.visitRecord.findMany({
    where: { createdByUserId: user.id },
    orderBy: { visitDate: "desc" },
    take: 50,
    include: { account: { select: { businessName: true, city: true } } },
  });
  const today = dayKey(new Date());
  const progress = await getTargetProgress(user.id, today);

  const runRows: PlannedRouteRow[] = runs.map((r) => {
    const summary = r.routeSummaryJson as { totalDriveMinutes?: number | null; stopCount?: number } | null;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      provinceCode: r.provinceCode,
      stopCount: summary?.stopCount ?? r._count.items,
      dailyVisitTarget: r.dailyVisitTarget,
      startQuery: r.startQuery,
      totalDriveMinutes: summary?.totalDriveMinutes ?? null,
      dayStartClock: r.dayStartClock ?? null,
    };
  });

  const visitRows: LoggedVisitRow[] = visits.map((v) => ({
    id: v.id,
    visitDate: v.visitDate.toISOString(),
    accountName: v.account?.businessName ?? v.placeId ?? "Unknown account",
    city: v.account?.city ?? null,
    visitType: v.visitType,
    outcomeCode: v.outcomeCode ?? null,
    outcomeLabel: visitOutcomeLabel(v.outcomeCode) ?? v.outcome ?? null,
    fitScore: v.fitScoreSnapshot ?? null,
    nextAction: v.nextAction ?? null,
  }));

  return (
    <PageContainer>
      <VisitsView
        runs={runRows}
        visits={visitRows}
        renderedAt={Date.now()}
        canPlan={hasPermission(user.role, "route.plan")}
        targets={<TargetProgressStrip progress={progress} day={today} />}
      />
    </PageContainer>
  );
}
