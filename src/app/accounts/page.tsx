import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "prospect.view");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const { q } = await searchParams;
  const provinceFilter = user.provinces.includes("*") ? undefined : { in: user.provinces };

  const accounts = await prisma.account.findMany({
    where: {
      ...(provinceFilter ? { provinceCode: provinceFilter } : {}),
      ...(q ? { businessName: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: {
      qualifications: { orderBy: { computedAt: "desc" }, take: 1 },
      publicProfile: { select: { website: true, googleRating: true } },
    },
  });

  return (
    <AppShell title="Prospecting">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Account research in your territory. Use Today to build the day&rsquo;s route; this page is
          for deeper discovery. Fit and lead product reflect the latest qualification run.
        </p>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search accounts…"
            className="h-10 w-56 rounded-lg border border-rule bg-panel px-3 text-sm text-ink placeholder:text-faint"
          />
          <button
            type="submit"
            className="h-10 rounded-lg border border-rule bg-panel px-4 text-[13px] font-medium text-ink hover:bg-canvas"
          >
            Search
          </button>
        </form>
      </div>

      <ul className="space-y-2.5">
        {accounts.map((a) => {
          const qual = a.qualifications[0];
          return (
            <li key={a.id} className="rounded-lg border border-rule bg-panel px-4 py-3.5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{a.businessName}</span>
                    {a.dataCompleteness === "needs_verification" && (
                      <span className="rounded bg-signal-tint px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide text-signal uppercase">
                        Verify
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.categoryLabel} · Segment {a.segmentNumber}.{a.categoryNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">
                    {a.streetAddress}, {a.city} {a.provinceCode} {a.postalCode}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {qual && (
                    <>
                      <span className="rounded bg-accent-tint px-2 py-1 text-xs font-semibold text-accent">
                        Fit {qual.fitScore}
                      </span>
                      <span className="rounded bg-canvas px-2 py-1 text-xs font-medium text-ink">
                        {qual.recommendedLeadProduct}
                      </span>
                    </>
                  )}
                  {a.googleMapsUrl && (
                    <a
                      href={a.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-rule px-2 py-1 text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
                    >
                      Maps
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {accounts.length === 0 && (
          <li className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-[13px] text-muted">
            {q ? `No accounts match “${q}”.` : "No accounts yet — run prospecting from Today to discover clinics."}
          </li>
        )}
      </ul>
    </AppShell>
  );
}
