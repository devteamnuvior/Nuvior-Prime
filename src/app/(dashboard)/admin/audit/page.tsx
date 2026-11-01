import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuditTable, type AuditRow } from "@/components/audit/AuditTable";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ action?: string; user?: string }> }) {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "audit.view");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const sp = await searchParams;
  const events = await prisma.auditEvent.findMany({
    where: {
      ...(sp.action ? { action: { contains: sp.action } } : {}),
      ...(sp.user ? { actorUserId: sp.user } : {}),
    },
    orderBy: { timestamp: "desc" },
    take: 100,
    include: { actorUser: { select: { email: true, displayName: true } } },
  });

  const rows: AuditRow[] = events.map((e) => ({
    id: e.id,
    timestamp: e.timestamp.toISOString(),
    actor: e.actorUser?.email ?? null,
    role: e.actorRoleSnapshot ?? null,
    action: e.action,
    resource: `${e.resourceType}${e.resourceId ? `:${e.resourceId.slice(0, 12)}` : ""}`,
    before: e.beforeState ? JSON.stringify(e.beforeState) : null,
    after: e.afterState ? JSON.stringify(e.afterState) : null,
  }));

  return (
    <PageContainer maxWidth="xl">
      <AdminTabs />
      <PageHeader title="Audit Log" description="Append-only. No edit/delete in UI. Secrets are never stored here. Showing the latest 100 events." />
      <AuditTable rows={rows} actionFilter={sp.action ?? ""} userFilter={sp.user ?? ""} />
    </PageContainer>
  );
}
