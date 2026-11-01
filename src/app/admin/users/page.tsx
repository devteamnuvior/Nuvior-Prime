import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AuthError } from "@/lib/authz";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { AdminTabs } from "@/components/admin/AdminTabs";
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
    <AppShell title="Users">
      <AdminTabs />
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-ink" style={{ fontFamily: "var(--display)" }}>
          Team members
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Manage who can sign in, what they can do and where they operate. Every change is written to the
          audit log.
        </p>
      </div>
      <AdminUsersPanel users={rows} currentUserId={user.id} renderedAt={Date.now()} />
    </AppShell>
  );
}
