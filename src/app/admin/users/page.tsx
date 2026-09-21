import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AuthError } from "@/lib/authz";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";

export default async function AdminUsersPage() {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "user.manage");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });

  return (
    <AppShell title="Users">
      <AdminUsersPanel
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          status: u.status,
          provinces: u.provinces,
        }))}
      />
    </AppShell>
  );
}
