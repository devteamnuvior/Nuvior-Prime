"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { AuditTableSkeleton } from "@/components/admin/AuditLogSkeleton";

export type AuditRow = {
  id: string;
  timestamp: string;
  actor: string | null;
  role: string | null;
  action: string;
  resource: string;
  before: string | null;
  after: string | null;
};

const fmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

function Mono({ value, max = 60 }: { value: string | null; max?: number }) {
  if (!value) return <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>;
  const short = value.length > max ? value.slice(0, max) + "…" : value;
  return (
    <Tooltip title={<Box component="pre" sx={{ m: 0, fontFamily: "var(--mono)", fontSize: "0.6875rem", whiteSpace: "pre-wrap", maxWidth: 420 }}>{value}</Box>}>
      <Typography variant="caption" noWrap sx={{ fontFamily: "var(--mono)", color: "text.secondary", display: "block" }}>
        {short}
      </Typography>
    </Tooltip>
  );
}

export function AuditTable({ rows, actionFilter, userFilter }: { rows: AuditRow[]; actionFilter: string; userFilter: string }) {
  const columns = React.useMemo<GridColDef<AuditRow>[]>(
    () => [
      {
        field: "timestamp",
        headerName: "Time",
        width: 200,
        valueGetter: (v) => new Date(v as string).getTime(),
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
            {fmt.format(new Date(row.timestamp))}
          </Typography>
        ),
      },
      { field: "actor", headerName: "Actor", flex: 1, minWidth: 180, valueFormatter: (v) => (v ? String(v) : "—") },
      { field: "role", headerName: "Role", width: 110, renderCell: ({ value }) => (value ? <CodeChip label={String(value)} /> : "—") },
      { field: "action", headerName: "Action", width: 190, renderCell: ({ value }) => <StatusChip dot={false} tone="primary" label={String(value)} /> },
      { field: "resource", headerName: "Resource", width: 200, renderCell: ({ value }) => <Mono value={String(value)} max={28} /> },
      { field: "before", headerName: "Before", flex: 1, minWidth: 180, sortable: false, renderCell: ({ value }) => <Mono value={value as string | null} /> },
      { field: "after", headerName: "After", flex: 1, minWidth: 180, sortable: false, renderCell: ({ value }) => <Mono value={value as string | null} /> },
    ],
    [],
  );

  return (
    <DataTable<AuditRow>
      rows={rows}
      columns={columns}
      label="Audit events"
      searchPlaceholder="Search loaded events"
      filters={
        <Box component="form" method="get" sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField name="action" defaultValue={actionFilter} placeholder="Action contains…" size="small" aria-label="Filter by action" sx={{ width: 180 }} />
          <TextField name="user" defaultValue={userFilter} placeholder="Actor user id" size="small" aria-label="Filter by actor user id" sx={{ width: 180 }} />
          <Button type="submit" variant="outlined">
            Filter
          </Button>
          {(actionFilter || userFilter) && (
            <Button component="a" href="/admin/audit" variant="text">
              Clear
            </Button>
          )}
        </Box>
      }
      initialSort={[{ field: "timestamp", sort: "desc" }]}
      skeleton={<AuditTableSkeleton rows={Math.min(Math.max(rows.length, 3), 10)} />}
      emptyState={{ illustration: "inbox", title: "No audit events", description: actionFilter || userFilter ? "No events match the current filter." : "Events are appended as users act in the app." }}
      density="compact"
    />
  );
}
