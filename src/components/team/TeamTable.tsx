"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { CodeChip } from "@/components/feedback/StatusChip";

export type TeamRunRow = {
  id: string;
  createdAt: string;
  provinceCode: string;
  rep: string;
  repName: string | null;
};

const fmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function TeamTable({ rows }: { rows: TeamRunRow[] }) {
  const columns = React.useMemo<GridColDef<TeamRunRow>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "When",
        width: 200,
        valueGetter: (v) => new Date(v as string).getTime(),
        valueFormatter: (v) => fmt.format(new Date(v as number)),
      },
      { field: "provinceCode", headerName: "Province", width: 110, renderCell: ({ value }) => <CodeChip label={String(value)} /> },
      {
        field: "rep",
        headerName: "Representative",
        flex: 1,
        minWidth: 240,
        renderCell: ({ row }) => (
          <span>
            {row.repName && (
              <Typography component="span" variant="body2" sx={{ fontWeight: 600, mr: 1.5 }}>
                {row.repName}
              </Typography>
            )}
            <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontFamily: "var(--mono)" }}>
              {row.rep}
            </Typography>
          </span>
        ),
      },
      {
        field: "id",
        headerName: "Run",
        width: 130,
        sortable: false,
        renderCell: ({ value }) => (
          <Typography variant="caption" sx={{ fontFamily: "var(--mono)", color: "text.secondary" }}>
            {String(value).slice(0, 8)}
          </Typography>
        ),
      },
    ],
    [],
  );
  return (
    <DataTable<TeamRunRow>
      rows={rows}
      columns={columns}
      label="Team route runs"
      searchPlaceholder="Search by rep or province"
      initialSort={[{ field: "createdAt", sort: "desc" }]}
      emptyState={{ illustration: "inbox", title: "No team runs in your territories", description: "Route runs by reps in your provinces will appear here." }}
    />
  );
}
