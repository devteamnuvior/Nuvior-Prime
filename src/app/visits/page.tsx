import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { clock12, duration } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

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

  return (
    <AppShell title="Visit History">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Planned routes */}
        <section>
          <h2 className="mb-3 text-[0.7rem] font-semibold tracking-[0.16em] text-faint uppercase">
            Planned routes
          </h2>
          <ul className="space-y-2.5">
            {runs.map((r) => {
              const summary = r.routeSummaryJson as {
                totalDriveMinutes?: number | null;
                stopCount?: number;
              } | null;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-rule bg-panel px-4 py-3.5 shadow-card"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">
                      {dateFmt.format(r.createdAt)}
                    </span>
                    <span className="text-xs text-muted">{r.provinceCode}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    {summary?.stopCount ?? r._count.items} stops · target {r.dailyVisitTarget} ·
                    from {r.startQuery}
                    {summary?.totalDriveMinutes != null
                      ? ` · ${duration(summary.totalDriveMinutes)} driving`
                      : ""}
                    {r.dayStartClock ? ` · ${clock12(r.dayStartClock)} start` : ""}
                  </p>
                </li>
              );
            })}
            {runs.length === 0 && <EmptyNote>No planned routes yet — build one from Today.</EmptyNote>}
          </ul>
        </section>

        {/* Logged visits */}
        <section>
          <h2 className="mb-3 text-[0.7rem] font-semibold tracking-[0.16em] text-faint uppercase">
            Logged visits
          </h2>
          <ul className="space-y-2.5">
            {visits.map((v) => (
              <li key={v.id} className="rounded-lg border border-rule bg-panel px-4 py-3.5 shadow-card">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-ink">
                    {v.account?.businessName ?? v.placeId ?? "Unknown account"}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{dateFmt.format(v.visitDate)}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {v.visitType}
                  {v.account?.city ? ` · ${v.account.city}` : ""}
                  {v.outcome ? ` · ${v.outcome}` : ""}
                </p>
                {v.nextAction && (
                  <p className="mt-1.5 text-[13px] text-ink">
                    <span className="font-medium text-muted">Next: </span>
                    {v.nextAction}
                  </p>
                )}
              </li>
            ))}
            {visits.length === 0 && <EmptyNote>No visits logged yet.</EmptyNote>}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-[13px] text-muted">
      {children}
    </li>
  );
}
