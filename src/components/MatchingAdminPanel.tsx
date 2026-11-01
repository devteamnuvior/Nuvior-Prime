"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { resolveCrmMatchAction } from "@/app/actions";
import { hasPermission } from "@/domain/auth/permissions";
import { actionsColumn, DataTable, GridActionsCellItem, type GridColDef } from "@/components/data-table/DataTable";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusChip } from "@/components/feedback/StatusChip";
import { toast } from "@/components/feedback/toast";

export type MappingRow = {
  id: string;
  crmExternalId: string;
  placeId: string;
  matchMethod: string;
  matchConfidence: number;
  verified: boolean;
  rejected: boolean;
};

function statusOf(m: MappingRow): "verified" | "rejected" | "pending" {
  return m.verified ? "verified" : m.rejected ? "rejected" : "pending";
}

export function MatchingAdminPanel({ mappings }: { mappings: MappingRow[] }) {
  const { data } = useSession();
  const canConfirm = data?.user?.role ? hasPermission(data.user.role, "mapping.confirm") : false;
  const [pending, start] = React.useTransition();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<MappingRow | null>(null);

  const resolve = React.useCallback(
    (m: MappingRow, decision: "confirm" | "reject") => {
      setBusyId(m.id);
      start(async () => {
        const r = await resolveCrmMatchAction({
          placeId: m.placeId,
          crmExternalId: m.crmExternalId,
          matchMethod: m.matchMethod,
          matchConfidence: m.matchConfidence,
          decision,
        });
        toast.result(r);
        setBusyId(null);
      });
    },
    [],
  );

  const columns = React.useMemo<GridColDef<MappingRow>[]>(
    () => [
      {
        field: "crmExternalId",
        headerName: "CRM account",
        flex: 1,
        minWidth: 180,
        renderCell: ({ value }) => (
          <Typography variant="body2" noWrap sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
            {String(value)}
          </Typography>
        ),
      },
      {
        field: "placeId",
        headerName: "Place",
        flex: 1,
        minWidth: 200,
        renderCell: ({ value }) => (
          <Typography variant="body2" noWrap sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: value ? "text.primary" : "text.disabled" }}>
            {value ? String(value) : "(no place)"}
          </Typography>
        ),
      },
      { field: "matchMethod", headerName: "Method", width: 130, renderCell: ({ value }) => <StatusChip dot={false} label={String(value)} /> },
      {
        field: "matchConfidence",
        headerName: "Confidence",
        type: "number",
        width: 160,
        renderCell: ({ value }) => {
          const pct = Math.round(Number(value) * 100);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 1 }}>
              <LinearProgress variant="determinate" value={pct} color={pct >= 80 ? "success" : pct >= 50 ? "warning" : "error"} aria-label={`Confidence ${pct}%`} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "divider" }} />
              <Typography variant="caption" sx={{ width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {pct}%
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        type: "singleSelect",
        valueOptions: ["pending", "verified", "rejected"],
        valueGetter: (_v, row) => statusOf(row),
        renderCell: ({ value }) => (
          <StatusChip tone={value === "verified" ? "success" : value === "rejected" ? "danger" : "warning"} label={value === "verified" ? "Verified" : value === "rejected" ? "Rejected" : "Pending"} />
        ),
      },
      actionsColumn<MappingRow>(({ row }) => {
        if (!canConfirm || row.verified || row.rejected) return [];
        const busy = busyId === row.id || pending;
        return [
          <GridActionsCellItem key="confirm" showInMenu icon={<CheckOutlined fontSize="small" />} label="Confirm match" disabled={busy} onClick={() => resolve(row, "confirm")} />,
          <GridActionsCellItem key="reject" showInMenu icon={<CloseOutlined fontSize="small" />} label="Reject match" disabled={busy} onClick={() => setRejecting(row)} style={{ color: "var(--nv-palette-error-main)" }} />,
        ];
      }),
    ],
    [canConfirm, busyId, pending, resolve],
  );

  return (
    <>
      <DataTable<MappingRow>
        rows={mappings}
        columns={columns}
        label="CRM account mappings"
        searchPlaceholder="Search CRM id or place"
        initialSort={[{ field: "matchConfidence", sort: "desc" }]}
        emptyState={{ illustration: "table", title: "No mappings yet", description: "Mappings appear after a CRM import is matched against discovered places." }}
        gridProps={{ getRowClassName: ({ row }) => (busyId === row.id ? "nv-row-busy" : ""), sx: { "& .nv-row-busy": { opacity: 0.6 } } }}
      />
      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this match?"
        description="The CRM account will no longer be linked to this place. The decision is audited."
        confirmLabel="Reject match"
        destructive
        onConfirm={() => {
          if (rejecting) resolve(rejecting, "reject");
          setRejecting(null);
        }}
      />
    </>
  );
}
