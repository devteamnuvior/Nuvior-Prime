"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { StatusChip } from "@/components/feedback/StatusChip";
import type { VerificationItem } from "@/domain/enrichment/types";

const STATUSES = ["CONFLICT", "AMBIGUOUS", "UNKNOWN", "MANUAL_VERIFY", "DERIVED"] as const;
const SOURCES = ["website", "places", "aggregation", "mock"] as const;

type Row = VerificationItem & { id: string };

const COLUMNS: GridColDef<Row>[] = [
  { field: "accountName", headerName: "Account", flex: 1.2, minWidth: 140 },
  {
    field: "fieldPath",
    headerName: "Field",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => (
      <Typography variant="body2" noWrap sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
        {value as string}
      </Typography>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    width: 140,
    renderCell: ({ value }) => <StatusChip tone="warning" uppercase dot={false} label={value as string} />,
  },
  {
    field: "reason",
    headerName: "Reason",
    flex: 1.5,
    minWidth: 160,
    renderCell: ({ value }) => (
      <Typography variant="body2" noWrap sx={{ color: "text.secondary" }} title={value as string}>
        {value as string}
      </Typography>
    ),
  },
  { field: "value", headerName: "Value", flex: 1.5, minWidth: 160 },
  { field: "sourceType", headerName: "Source", width: 110 },
];

/** Run-scoped verification items (manager diagnostics). Persisted items live on /verification. */
export function VerificationQueuePanel({ items }: { items: VerificationItem[] }) {
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      items
        .filter((i) => (status ? i.status === status : true))
        .filter((i) => (source ? i.sourceType === source : true))
        .slice(0, 100)
        .map((i, idx) => ({ ...i, id: `${i.accountId}-${i.fieldPath}-${idx}` })),
    [items, status, source],
  );

  if (items.length === 0) return null;

  return (
    <Box>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        Verification queue (dev) · {rows.length}/{items.length}
      </Typography>
      <DataTable<Row>
        rows={rows}
        columns={COLUMNS}
        label="Verification queue"
        searchPlaceholder="Filter account or field…"
        density="compact"
        columnTools={false}
        initialPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        maxHeight={400}
        filters={
          <>
            <TextField select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" sx={{ minWidth: 140 }} slotProps={{ select: { displayEmpty: true } }}>
              <MenuItem value="">All statuses</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source" sx={{ minWidth: 130 }} slotProps={{ select: { displayEmpty: true } }}>
              <MenuItem value="">All sources</MenuItem>
              {SOURCES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
        emptyState={{ title: "No items match", description: "Clear the status or source filter.", illustration: "shield" }}
      />
    </Box>
  );
}
