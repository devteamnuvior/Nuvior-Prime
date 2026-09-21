import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; user?: string }>;
}) {
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

  return (
    <AppShell title="Audit Log">
      <p className="mb-4 text-sm text-muted">
        Append-only. No edit/delete in UI. Secrets are never stored here.
      </p>
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <input
          name="action"
          placeholder="action filter"
          defaultValue={sp.action ?? ""}
          className="border border-rule px-2 py-1"
        />
        <button type="submit" className="border border-accent px-3 py-1 text-accent">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto border border-rule bg-panel">
        <table className="w-full text-left text-xs">
          <thead className="font-mono uppercase text-muted">
            <tr>
              <th className="p-2">Time</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Before → After</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-rule-soft align-top">
                <td className="p-2 font-mono whitespace-nowrap">
                  {e.timestamp.toISOString().slice(0, 19)}
                </td>
                <td className="p-2">{e.actorUser?.email ?? "—"}</td>
                <td className="p-2">{e.actorRoleSnapshot ?? "—"}</td>
                <td className="p-2">{e.action}</td>
                <td className="p-2">
                  {e.resourceType}
                  {e.resourceId ? `:${e.resourceId.slice(0, 12)}` : ""}
                </td>
                <td className="p-2 font-mono text-[0.65rem] text-muted">
                  {e.beforeState ? JSON.stringify(e.beforeState) : "—"} →{" "}
                  {e.afterState ? JSON.stringify(e.afterState) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
