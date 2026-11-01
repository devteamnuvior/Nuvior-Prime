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

  const users = await prisma.user.findMany({ orderBy: { displayName: "asc" } });

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
  }));

  return (
    <PageContainer>
      <AdminTabs />
      <AdminUsersPanel users={rows} currentUserId={user.id} renderedAt={Date.now()} />
    </PageContainer>
  );
}
