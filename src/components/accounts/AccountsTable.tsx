"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import StarOutlineOutlined from "@mui/icons-material/StarOutlineOutlined";
import { actionsColumn, DataTable, GridActionsCellItem, type GridColDef } from "@/components/data-table/DataTable";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";

export type AccountRow = {
  id: string;
  businessName: string;
  needsVerification: boolean;
  address: string;
  city: string;
  provinceCode: string;
  rating: number | null;
  website: string | null;
  googleMapsUrl: string | null;
};

export function AccountsTable({ rows, query }: { rows: AccountRow[]; query: string }) {
  const columns = React.useMemo<GridColDef<AccountRow>[]>(
    () => [
      {
        field: "businessName",
        headerName: "Account",
        flex: 1.6,
        minWidth: 260,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {row.businessName}
              </Typography>
              {row.needsVerification && <StatusChip tone="warning" dot={false} uppercase label="Verify" />}
            </Box>
            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
              {row.address}
            </Typography>
          </Box>
        ),
      },
      { field: "city", headerName: "City", width: 140 },
      { field: "provinceCode", headerName: "Prov.", width: 90, renderCell: ({ value }) => <CodeChip label={String(value)} /> },
      {
        field: "rating",
        headerName: "Rating",
        type: "number",
        width: 100,
        renderCell: ({ value }) =>
          value == null ? (
            <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>
          ) : (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <StarOutlineOutlined sx={{ fontSize: 14, color: "warning.main" }} aria-hidden />
              <Typography variant="body2">{Number(value).toFixed(1)}</Typography>
            </Box>
          ),
      },
      actionsColumn<AccountRow>(({ row }) => {
        const items = [];
        if (row.googleMapsUrl)
          items.push(
            <GridActionsCellItem key="maps" showInMenu icon={<MapOutlined fontSize="small" />} label="Open in Google Maps" component="a" href={row.googleMapsUrl} target="_blank" rel="noreferrer" />,
          );
        if (row.website)
          items.push(<GridActionsCellItem key="web" showInMenu icon={<LanguageOutlined fontSize="small" />} label="Open website" component="a" href={row.website} target="_blank" rel="noreferrer" />);
        return items;
      }),
    ],
    [],
  );

  return (
    <DataTable<AccountRow>
      rows={rows}
      columns={columns}
      label="Accounts"
      searchable={false}
      filters={
        <Box component="form" method="get" sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            name="q"
            defaultValue={query}
            placeholder="Search accounts…"
            size="small"
            aria-label="Search accounts by name"
            sx={{ width: { xs: 1, sm: 256 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined sx={{ fontSize: 18, color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button type="submit" variant="outlined">
            Search
          </Button>
        </Box>
      }
      initialSort={[{ field: "businessName", sort: "asc" }]}
      emptyState={
        query
          ? { illustration: "search", title: `No accounts match “${query}”`, description: "Try another name or clear the search.", action: <Button component="a" href="/accounts" size="small" variant="outlined">Clear search</Button> }
          : { illustration: "map", title: "No accounts yet", description: "Run prospecting from Today's Route to discover clinics in your territory." }
      }
      gridProps={{ rowHeight: 60 }}
    />
  );
}
