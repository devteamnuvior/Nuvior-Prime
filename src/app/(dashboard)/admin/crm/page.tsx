import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireSessionUser } from "@/lib/session";
import { requirePermission, AuthError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCrmProviderConfig } from "@/lib/crmConfig";
import { getCrmProvider } from "@/providers";
import { listOwnershipConflicts } from "@/domain/crm/ownershipConflicts";
import { ImportCrmProvider } from "@/providers/crm/importCrmProvider";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard, KpiGrid } from "@/components/feedback/KpiCard";
import { StatusChip } from "@/components/feedback/StatusChip";
import { ConflictsTable, type ConflictRow } from "@/components/crm/ConflictsTable";

const fmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

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
  const stale = crm instanceof ImportCrmProvider ? crm.isStale() : false;
  const unavailableReason =
    "getUnavailableReason" in crm && typeof (crm as { getUnavailableReason?: () => string | null }).getUnavailableReason === "function"
      ? (crm as { getUnavailableReason: () => string | null }).getUnavailableReason()
      : null;

  const conflictRows: ConflictRow[] = conflicts.map((c, i) => ({
    id: `${c.crmExternalId}-${i}`,
    crmExternalId: c.crmExternalId,
    placeId: c.placeId,
    crmAssignedRep: c.crmAssignedRep,
    appAssignees: c.appAssignees.map((a) => a.email).join(", ") || "—",
  }));

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "CRM_PROVIDER", value: cfg.mode },
    {
      label: "Provider instance",
      value: (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {crm.name}
          {crm.isUnavailable() ? <StatusChip tone="danger" label="Unavailable" /> : <StatusChip tone="success" label="Available" />}
        </Box>
      ),
    },
    { label: "Stale indicator", value: stale ? <StatusChip tone="warning" label="Stale (TTL exceeded)" /> : <StatusChip tone="success" label="OK / n/a" /> },
    { label: "Outage / config", value: unavailableReason ?? "none" },
  ];

  return (
    <PageContainer>
      <AdminTabs />
      <PageHeader title="CRM Diagnostics" description="Admin view of CRM source health. Raw payloads are not shown. Reps do not see this page." />

      <Box sx={{ display: "grid", gap: 6 }}>
        <KpiGrid>
          <KpiCard label="Mirror accounts" value={mirrorCount.toLocaleString("en-CA")} icon={StorageOutlined} tone="primary" />
          <KpiCard label="Staged source rows" value={sourceCount.toLocaleString("en-CA")} icon={CloudSyncOutlined} />
          <KpiCard label="Last import" value={latest?.importedAt ? fmt.format(latest.importedAt) : "Never"} icon={ScheduleOutlined} tone={stale ? "warning" : "neutral"} hint={stale ? "Import is stale" : undefined} />
          <KpiCard label="Ownership conflicts" value={conflicts.length} icon={WarningAmberOutlined} tone={conflicts.length ? "warning" : "success"} hint="CRM rep ≠ app assignment" />
        </KpiGrid>

        <Card>
          <CardHeader title="Provider" subheader="Configuration resolved at request time. Values are names only, never keys." />
          <CardContent>
            <Box component="dl" sx={{ m: 0, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {facts.map((f) => (
                <Box key={f.label}>
                  <Typography component="dt" variant="eyebrow" sx={{ display: "block", fontFamily: "var(--mono)" }}>
                    {f.label}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.5 }}>
                    {f.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box>
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
            Ownership conflicts
          </Typography>
          <ConflictsTable rows={conflictRows} />
        </Box>

        <Typography variant="caption" sx={{ fontFamily: "var(--mono)", color: "text.secondary" }}>
          Ops: npm run crm:import -- --dir fixtures/crm --dry-run · npm run validate:crm
        </Typography>
      </Box>
    </PageContainer>
  );
}
