"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { KpiCard, KpiGrid } from "@/components/feedback/KpiCard";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { clock12, duration } from "@/lib/format";

export type PlannedRouteRow = {
  id: string;
  createdAt: string;
  provinceCode: string;
  stopCount: number;
  dailyVisitTarget: number;
  startQuery: string;
  totalDriveMinutes: number | null;
  dayStartClock: string | null;
};

export type LoggedVisitRow = {
  id: string;
  visitDate: string;
  accountName: string;
  city: string | null;
  visitType: string;
  outcomeCode: string | null;
  outcomeLabel: string | null;
  fitScore: number | null;
  nextAction: string | null;
};

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

const dateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
/** Visit dates are calendar dates stored at UTC midnight — format them in UTC so they never shift a day. */
const visitDateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function VisitsView({ runs, visits }: { runs: PlannedRouteRow[]; visits: LoggedVisitRow[] }) {
  const [tab, setTab] = React.useState<"routes" | "visits">("routes");

  const totals = React.useMemo(
    () => ({
      stops: runs.reduce((a, r) => a + r.stopCount, 0),
      drive: runs.reduce((a, r) => a + (r.totalDriveMinutes ?? 0), 0),
    }),
    [runs],
  );

  const routeColumns = React.useMemo<GridColDef<PlannedRouteRow>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "Date",
        width: 190,
        valueGetter: (v) => new Date(v as string).getTime(),
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {dateFmt.format(new Date(row.createdAt))}
          </Typography>
        ),
      },
      { field: "provinceCode", headerName: "Province", width: 110, renderCell: ({ value }) => <CodeChip label={value as string} /> },
      { field: "stopCount", headerName: "Stops", type: "number", width: 90 },
      { field: "dailyVisitTarget", headerName: "Target", type: "number", width: 90 },
      { field: "startQuery", headerName: "Start", flex: 1, minWidth: 200 },
      {
        field: "totalDriveMinutes",
        headerName: "Driving",
        type: "number",
        width: 110,
        valueFormatter: (v) => (v == null ? "—" : duration(v as number)),
      },
      {
        field: "dayStartClock",
        headerName: "Day start",
        width: 110,
        valueFormatter: (v) => (v ? clock12(v as string) : "—"),
      },
    ],
    [],
  );

  const visitColumns = React.useMemo<GridColDef<LoggedVisitRow>[]>(
    () => [
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
      {
        field: "visitDate",
        headerName: "Date",
        width: 170,
        valueGetter: (v) => new Date(v as string).getTime(),
        valueFormatter: (v) => visitDateFmt.format(new Date(v as number)),
      },
      { field: "visitType", headerName: "Type", width: 130, renderCell: ({ value }) => <StatusChip dot={false} tone="primary" label={String(value)} /> },
      {
        field: "outcomeLabel",
        headerName: "Outcome",
        width: 220,
        renderCell: ({ row }) =>
          row.outcomeLabel ? (
            <StatusChip tone={row.outcomeCode ? (OUTCOME_TONE[row.outcomeCode] ?? "neutral") : "neutral"} label={row.outcomeLabel} />
          ) : (
            "—"
          ),
      },
      {
        field: "fitScore",
        headerName: "Fit",
        type: "number",
        width: 70,
        valueFormatter: (v) => (v == null ? "—" : String(v)),
      },
      { field: "nextAction", headerName: "Next action", flex: 1, minWidth: 220, valueFormatter: (v) => (v ? String(v) : "—") },
    ],
    [],
  );

  return (
    <Box sx={{ display: "grid", gap: 6 }}>
      <KpiGrid>
        <KpiCard label="Planned routes" value={runs.length} icon={RouteOutlined} tone="primary" hint="Last 30 runs" />
        <KpiCard label="Logged visits" value={visits.length} icon={FactCheckOutlined} tone="success" hint="Last 50 records" />
        <KpiCard label="Stops planned" value={totals.stops} icon={PlaceOutlined} />
        <KpiCard label="Driving planned" value={totals.drive ? duration(totals.drive) : "—"} icon={DirectionsCarOutlined} />
      </KpiGrid>

      <Box>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Visit history sections" sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
          <Tab value="routes" label={`Planned routes (${runs.length})`} />
          <Tab value="visits" label={`Logged visits (${visits.length})`} />
        </Tabs>
        {tab === "routes" ? (
          <DataTable<PlannedRouteRow>
            rows={runs}
            columns={routeColumns}
            label="Planned routes"
            searchPlaceholder="Search routes"
            initialSort={[{ field: "createdAt", sort: "desc" }]}
            emptyState={{
              illustration: "map",
              title: "No planned routes yet",
              description: "Build one from Today's Route and it will appear here.",
              action: (
                <Button component={Link} href="/" variant="contained" size="small">
                  Go to Today
                </Button>
              ),
            }}
          />
        ) : (
          <DataTable<LoggedVisitRow>
            rows={visits}
            columns={visitColumns}
            label="Logged visits"
            searchPlaceholder="Search visits"
            initialSort={[{ field: "visitDate", sort: "desc" }]}
            emptyState={{ illustration: "inbox", title: "No visits logged yet", description: "Visits you record from a clinic brief show up here." }}
          />
        )}
      </Box>
    </Box>
  );
}
