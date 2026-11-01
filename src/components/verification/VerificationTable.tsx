"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { StatusChip } from "@/components/feedback/StatusChip";

export type VerificationRow = {
  id: string;
  accountName: string;
  location: string;
  capturedAt: string;
  fieldPath: string;
  valueSnapshot: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

const dateFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" });

export function VerificationTable({ rows }: { rows: VerificationRow[] }) {
  const columns = React.useMemo<GridColDef<VerificationRow>[]>(
    () => [
      {
        field: "accountName",
        headerName: "Account",
        flex: 1.2,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {row.accountName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
              {row.location}
            </Typography>
          </Box>
        ),
      },
      {
        field: "fieldPath",
        headerName: "Field",
        width: 200,
        renderCell: ({ value }) => (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <StatusChip tone="warning" dot={false} uppercase label="Verify" />
            <Typography variant="body2" sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
              {String(value)}
            </Typography>
          </Box>
        ),
      },
      { field: "valueSnapshot", headerName: "Value", flex: 1.4, minWidth: 220 },
      {
        field: "sourceType",
        headerName: "Source",
        width: 180,
        renderCell: ({ row }) => (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {row.sourceType.toLowerCase()}
            </Typography>
            {row.sourceUrl && (
              <Link href={row.sourceUrl} target="_blank" rel="noreferrer" variant="body2" noWrap sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                {row.sourceTitle ?? "link"}
                <OpenInNewOutlined sx={{ fontSize: 12 }} aria-hidden />
              </Link>
            )}
          </Box>
        ),
      },
      {
        field: "capturedAt",
        headerName: "Captured",
        width: 130,
        valueGetter: (v) => new Date(v as string).getTime(),
        valueFormatter: (v) => dateFmt.format(new Date(v as number)),
      },
    ],
    [],
  );
  return (
    <DataTable<VerificationRow>
      rows={rows}
      columns={columns}
      label="Verification queue"
      searchPlaceholder="Search account or field"
      initialSort={[{ field: "capturedAt", sort: "desc" }]}
      emptyState={{
        illustration: "shield",
        title: "Nothing waiting for verification",
        description: "Items raised during a route run appear in Run diagnostics on Today's Route.",
      }}
      gridProps={{ rowHeight: 56 }}
    />
  );
}
