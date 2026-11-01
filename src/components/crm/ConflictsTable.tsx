"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";

export type ConflictRow = {
  id: string;
  crmExternalId: string;
  placeId: string | null;
  crmAssignedRep: string;
  appAssignees: string;
};

export function ConflictsTable({ rows }: { rows: ConflictRow[] }) {
  const columns = React.useMemo<GridColDef<ConflictRow>[]>(
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
      { field: "crmAssignedRep", headerName: "CRM rep", flex: 1, minWidth: 160 },
      { field: "appAssignees", headerName: "App assignment", flex: 1.4, minWidth: 220 },
      {
        field: "placeId",
        headerName: "Place",
        width: 160,
        renderCell: ({ value }) => (
          <Typography variant="body2" noWrap sx={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: value ? "text.secondary" : "text.disabled" }}>
            {value ? String(value) : "—"}
          </Typography>
        ),
      },
    ],
    [],
  );
  return (
    <DataTable<ConflictRow>
      rows={rows}
      columns={columns}
      label="Ownership conflicts"
      searchPlaceholder="Search conflicts"
      columnTools={false}
      initialPageSize={10}
      maxHeight={480}
      emptyState={{ illustration: "shield", title: "No ownership conflicts", description: "CRM rep assignments agree with app assignments." }}
    />
  );
}
