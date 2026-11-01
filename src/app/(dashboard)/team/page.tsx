import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { canAccessProvince } from "@/domain/auth/permissions";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamTable, type TeamRunRow } from "@/components/team/TeamTable";

export default async function TeamPage() {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "visit.view.team");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const runs = await prisma.visitListRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdByUser: { select: { email: true, displayName: true, provinces: true } } },
  });

  const visible = runs.filter((r) => canAccessProvince(user, r.provinceCode));

  const rows: TeamRunRow[] = visible.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    provinceCode: r.provinceCode,
    rep: r.createdByUser?.email ?? r.repIdPlaceholder ?? "unknown",
    repName: r.createdByUser?.displayName ?? null,
  }));

  return (
    <PageContainer>
      <PageHeader title="Team Activity" description="Route runs by representatives in the provinces you manage." />
      <TeamTable rows={rows} />
    </PageContainer>
  );
}
