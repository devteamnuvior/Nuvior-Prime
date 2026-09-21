import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const dateFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" });

export default async function VerificationPage() {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "verification.review");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const provinceFilter = user.provinces.includes("*") ? undefined : { in: user.provinces };
  const items = await prisma.fieldEvidence.findMany({
    where: {
      needsVerification: true,
      ...(provinceFilter ? { account: { provinceCode: provinceFilter } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: 100,
    include: { account: { select: { businessName: true, city: true, provinceCode: true } } },
  });

  return (
    <AppShell title="Verification">
      <p className="mb-5 max-w-2xl text-[13px] text-muted">
        Fields that could not be confirmed from public or internal sources. Items surfaced during a
        route run also appear under Run diagnostics on Today&rsquo;s Route.
      </p>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.id} className="rounded-lg border border-rule bg-panel px-4 py-3.5 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-semibold text-ink">{i.account.businessName}</span>
              <span className="text-xs text-faint">
                {i.account.city}, {i.account.provinceCode} · {dateFmt.format(i.capturedAt)}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink">
              <span className="rounded bg-signal-tint px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide text-signal uppercase">
                Verify
              </span>{" "}
              <span className="font-medium">{i.fieldPath}</span> — {i.valueSnapshot}
            </p>
            <p className="mt-1 text-xs text-muted">
              Source: {i.sourceType.toLowerCase()}
              {i.sourceUrl ? (
                <>
                  {" · "}
                  <a href={i.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {i.sourceTitle ?? "link"}
                  </a>
                </>
              ) : null}
            </p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-[13px] text-muted">
            Nothing waiting for verification. Items raised during a route run appear in Run
            diagnostics on Today&rsquo;s Route.
          </li>
        )}
      </ul>
    </AppShell>
  );
}
