import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { requirePermission, AuthError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCrmProviderConfig } from "@/lib/crmConfig";
import { getCrmProvider } from "@/providers";
import { listOwnershipConflicts } from "@/domain/crm/ownershipConflicts";
import { ImportCrmProvider } from "@/providers/crm/importCrmProvider";

export default async function AdminCrmPage() {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "admin.settings");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const cfg = getCrmProviderConfig();
  const crm = getCrmProvider();
  const mirrorCount = await prisma.canonicalCrmAccount.count().catch(() => 0);
  const sourceCount = await prisma.crmSourceRecord.count().catch(() => 0);
  const latest = await prisma.canonicalCrmAccount
    .findFirst({ orderBy: { importedAt: "desc" }, select: { importedAt: true } })
    .catch(() => null);
  const conflicts = await listOwnershipConflicts().catch(() => []);
  const stale =
    crm instanceof ImportCrmProvider ? crm.isStale() : false;
  const unavailableReason =
    "getUnavailableReason" in crm &&
    typeof (crm as { getUnavailableReason?: () => string | null }).getUnavailableReason ===
      "function"
      ? (crm as { getUnavailableReason: () => string | null }).getUnavailableReason()
      : null;

  return (
    <AppShell title="CRM Diagnostics">
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Manager/admin view of CRM source health. Raw payloads are not shown. Reps do not see this
        page.
      </p>
      <dl className="grid gap-3 border border-rule bg-panel p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">CRM_PROVIDER</dt>
          <dd>{cfg.mode}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Provider instance</dt>
          <dd>
            {crm.name}
            {crm.isUnavailable() ? " (unavailable)" : ""}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Mirror accounts</dt>
          <dd>{mirrorCount}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Staged source rows</dt>
          <dd>{sourceCount}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Last import</dt>
          <dd>{latest?.importedAt?.toISOString() ?? "never"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Stale indicator</dt>
          <dd>{stale ? "stale (TTL exceeded)" : "ok / n/a"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[0.65rem] text-muted uppercase">Outage / config</dt>
          <dd className="text-xs">{unavailableReason ?? "none"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[0.65rem] text-muted uppercase">
            Ownership conflicts (CRM rep ≠ app assignment)
          </dt>
          <dd className="text-xs">
            {conflicts.length === 0
              ? "none detected"
              : conflicts
                  .slice(0, 20)
                  .map(
                    (c) =>
                      `${c.crmExternalId.slice(0, 8)}… / ${c.crmAssignedRep} vs app[${c.appAssignees
                        .map((a) => a.email)
                        .join(",")}]`,
                  )
                  .join(" · ")}
          </dd>
        </div>
      </dl>
      <p className="mt-4 font-mono text-[0.68rem] text-muted">
        Ops: npm run crm:import -- --dir fixtures/crm --dry-run · npm run validate:crm
      </p>
    </AppShell>
  );
}
