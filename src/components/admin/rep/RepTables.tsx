"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { duration } from "@/lib/format";
import type { RepAuditRow, RepRecentRoute, RepRecentVisit } from "@/lib/repProfile";

const OUTCOME_TONE: Record<string, "neutral" | "primary" | "success" | "warning" | "danger"> = {
  INTERESTED: "success",
  QUOTE_REQUESTED: "success",
  ORDER_PLACED: "success",
  ACADEMY_SIGNUP: "success",
  MET_DECISION_MAKER: "primary",
  SAMPLE_LEFT: "primary",
  NOT_AVAILABLE: "warning",
  NOT_INTERESTED: "danger",
  CLOSED_OR_MOVED: "neutral",
};

const dayFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function RecentVisitsTable({ rows, today }: { rows: RepRecentVisit[]; today: string }) {
  const columns = React.useMemo<GridColDef<RepRecentVisit>[]>(
    () => [
      {
        field: "day",
        headerName: "Date",
        width: 130,
        valueFormatter: (v) => dayFmt.format(new Date(`${v}T00:00:00.000Z`)),
      },
      {
        field: "accountName",
        headerName: "Account",
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {row.accountName}
            </Typography>
            {row.city && (
              <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                {row.city}
              </Typography>
            )}
          </Box>
        ),
      },
      { field: "visitType", headerName: "Type", width: 150, renderCell: ({ value }) => <StatusChip dot={false} tone="primary" label={String(value)} /> },
      {
        field: "outcomeLabel",
        headerName: "Outcome",
        width: 220,
        renderCell: ({ row }) => (row.outcomeLabel ? <StatusChip tone={row.outcomeCode ? (OUTCOME_TONE[row.outcomeCode] ?? "neutral") : "neutral"} label={row.outcomeLabel} /> : "—"),
      },
      { field: "fitScore", headerName: "Fit", type: "number", width: 70, valueFormatter: (v) => (v == null ? "—" : String(v)) },
      {
        field: "followUpDate",
        headerName: "Follow-up",
        width: 130,
        renderCell: ({ value }) => {
          if (!value) return "—";
          const overdue = String(value) < today;
          return <StatusChip dot={false} tone={overdue ? "warning" : "neutral"} label={dayFmt.format(new Date(`${value}T00:00:00.000Z`))} />;
        },
      },
      { field: "nextAction", headerName: "Next action", flex: 1, minWidth: 200, valueFormatter: (v) => (v ? String(v) : "—") },
    ],
    [today],
  );
  return (
    <DataTable<RepRecentVisit>
      rows={rows}
      columns={columns}
      label="Recent visits"
      searchable={false}
      columnTools={false}
      initialSort={[{ field: "day", sort: "desc" }]}
      initialPageSize={10}
      pageSizeOptions={[10, 25]}
      emptyState={{ illustration: "inbox", title: "No visits logged", description: "Visits this rep records from the clinic drawer appear here." }}
    />
  );
}

export function RecentRoutesTable({ rows }: { rows: RepRecentRoute[] }) {
  const columns = React.useMemo<GridColDef<RepRecentRoute>[]>(
    () => [
      { field: "createdAt", headerName: "Built", width: 160, valueGetter: (v) => new Date(v as string).getTime(), valueFormatter: (v) => stampFmt.format(new Date(v as number)) },
      { field: "provinceCode", headerName: "Province", width: 100, renderCell: ({ value }) => <CodeChip label={String(value)} /> },
      { field: "stopCount", headerName: "Stops", type: "number", width: 80 },
      { field: "dailyVisitTarget", headerName: "Asked for", type: "number", width: 100 },
      { field: "startQuery", headerName: "Start", flex: 1, minWidth: 200 },
      { field: "totalDriveMinutes", headerName: "Driving", type: "number", width: 100, valueFormatter: (v) => (v == null ? "—" : duration(v as number)) },
    ],
    [],
  );
  return (
    <DataTable<RepRecentRoute>
      rows={rows}
      columns={columns}
      label="Recent routes"
      searchable={false}
      columnTools={false}
      initialSort={[{ field: "createdAt", sort: "desc" }]}
      initialPageSize={10}
      pageSizeOptions={[10, 20]}
      emptyState={{ illustration: "map", title: "No routes built", description: "Routes this rep builds on Today's Route appear here." }}
    />
  );
}

const auditFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function AuditList({ rows }: { rows: RepAuditRow[] }) {
  if (!rows.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No audit events for this user yet.
      </Typography>
    );
  }
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
      {rows.map((e) => (
        <Box component="li" key={e.id} sx={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center", gap: 3, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="caption" sx={{ fontFamily: "var(--mono)", color: "text.secondary" }}>
            {auditFmt.format(new Date(e.timestamp))}
          </Typography>
          <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 2 }}>
            <StatusChip dot={false} tone="primary" label={e.action} />
            <Typography variant="caption" noWrap sx={{ fontFamily: "var(--mono)", color: "text.secondary" }}>
              {e.resource}
            </Typography>
          </Box>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
            {e.actor ?? "system"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
