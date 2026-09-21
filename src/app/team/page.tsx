import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { canAccessProvince } from "@/domain/auth/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

  return (
    <AppShell title="Team Activity">
      <ul className="space-y-2 border border-rule bg-panel p-4 text-sm">
        {visible.map((r) => (
          <li key={r.id} className="font-mono text-xs">
            {r.createdAt.toISOString().slice(0, 16)} · {r.provinceCode} ·{" "}
            {r.createdByUser?.email ?? r.repIdPlaceholder} · run {r.id.slice(0, 8)}
          </li>
        ))}
        {visible.length === 0 && <li className="text-muted">No team runs in your territories.</li>}
      </ul>
    </AppShell>
  );
}
