import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { VisitsView, type LoggedVisitRow, type PlannedRouteRow } from "@/components/visits/VisitsView";

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
    outcome: v.outcome ?? null,
    nextAction: v.nextAction ?? null,
  }));

  return (
    <PageContainer>
      <PageHeader title="Visit History" description="Routes you planned and visits you logged, most recent first." />
      <VisitsView runs={runRows} visits={visitRows} />
    </PageContainer>
  );
}
