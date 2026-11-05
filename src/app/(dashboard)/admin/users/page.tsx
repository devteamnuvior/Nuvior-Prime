import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PageContainer } from "@/components/layout/PageContainer";
import type { AdminUserRow } from "@/domain/auth/userAdmin";

export default async function AdminUsersPage() {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "user.manage");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const [users, recentVisits] = await Promise.all([
    prisma.user.findMany({ orderBy: { displayName: "asc" } }),
    prisma.visitRecord.findMany({ where: { visitDate: { gte: new Date(now - 30 * DAY) }, createdByUserId: { not: null } }, select: { createdByUserId: true, visitDate: true } }),
  ]);
  // Six 5-day buckets, oldest first, so the list can draw a tiny activity chart per person.
  const activityByUser = new Map<string, number[]>();
  for (const v of recentVisits) {
    const bucket = 5 - Math.min(5, Math.floor((now - v.visitDate.getTime()) / (5 * DAY)));
    const arr = activityByUser.get(v.createdByUserId!) ?? [0, 0, 0, 0, 0, 0];
    arr[bucket] += 1;
    activityByUser.set(v.createdByUserId!, arr);
  }

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    status: u.status,
    provinces: u.provinces,
    territories: u.territories,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    activity: activityByUser.get(u.id) ?? [0, 0, 0, 0, 0, 0],
  }));

  return (
    <PageContainer>
      <AdminTabs />
      <AdminUsersPanel users={rows} currentUserId={user.id} renderedAt={Date.now()} />
    </PageContainer>
  );
}
