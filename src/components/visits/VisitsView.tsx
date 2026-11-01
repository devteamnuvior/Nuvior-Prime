"use client";

import * as React from "react";
import Link from "next/link";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { HeroButton } from "@/components/feedback/HeroButton";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { PageHeader } from "@/components/layout/PageHeader";
import { avatarHue, formatRelative } from "@/components/admin/userPresentation";
import { EASE } from "@/theme/tokens";
import { clock12, duration } from "@/lib/format";
import { VisitStats } from "./VisitStats";
import { OUTCOME_BUCKETS, OUTCOME_TONE, VISIT_TYPE_LABEL, outcomeBucket, type LoggedVisitRow, type OutcomeBucket, type PlannedRouteRow } from "./visitPresentation";

export type { LoggedVisitRow, PlannedRouteRow } from "./visitPresentation";

const REDUCED = "@media (prefers-reduced-motion: reduce)";

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* Rows settle in one after another; only the first dozen are staggered so long lists do not lag. */
const rowStagger = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`& .MuiDataGrid-row:nth-of-type(${i + 1})`, { animationDelay: `${i * 40}ms` }]));
const tableSx = {
  "& .MuiDataGrid-row": { animation: `${rise} 360ms ${EASE} both`, [REDUCED]: { animation: "none" } },
  ...rowStagger,
};

const dateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" });
/** Visit dates are calendar dates stored at UTC midnight — format them in UTC so they never shift a day. */
const visitDateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

type OutcomeFilter = "ALL" | OutcomeBucket | "NONE";
type TypeFilter = "ALL" | keyof typeof VISIT_TYPE_LABEL;

/** Filter selects read like the search placeholder until a value is chosen. */
const filterSx = (isDefault: boolean) => ({ fontSize: "0.8125rem", color: isDefault ? "text.disabled" : "text.primary" });

function AccountTile({ name }: { name: string }) {
  const hue = avatarHue(name);
  const initials = name
    .replace(/^Mock\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <Box aria-hidden sx={{ width: 36, height: 36, borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `hsl(${hue} 30% 90%)`, color: `hsl(${hue} 45% 28%)`, fontSize: "0.75rem", fontWeight: 700 }}>
      {initials || <StorefrontOutlined sx={{ fontSize: 18 }} />}
    </Box>
  );
}

/** Five dots, filled up to the fit score; green from 4 (a quality visit). */
function FitMeter({ score }: { score: number | null }) {
  if (score == null)
    return (
      <Typography variant="body2" sx={{ color: "text.disabled" }}>
        —
      </Typography>
    );
  const quality = score >= 4;
  return (
    <Tooltip title={`Fit ${score} of 5${quality ? " · quality visit" : ""}`}>
      <Box role="img" aria-label={`Fit ${score} of 5`} sx={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: i < score ? (quality ? "success.main" : "primary.light") : "grey.200" }} />
        ))}
      </Box>
    </Tooltip>
  );
}

function DateCell({ iso, fmt, now }: { iso: string; fmt: Intl.DateTimeFormat; now: number }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {fmt.format(new Date(iso))}
      </Typography>
      <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
        {formatRelative(iso, now)}
      </Typography>
    </Box>
  );
}

export function VisitsView({
  runs,
  visits,
  renderedAt,
  canPlan,
  targets,
}: {
  runs: PlannedRouteRow[];
  visits: LoggedVisitRow[];
  /** Server timestamp used for relative times, so SSR and hydration agree. */
  renderedAt: number;
  /** Reps can plan a route; the header then carries the call to action. */
  canPlan: boolean;
  /** Server-rendered target progress strip, shown under the header. */
  targets?: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<"visits" | "routes">("visits");
  const [now, setNow] = React.useState(renderedAt);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [outcomeFilter, setOutcomeFilter] = React.useState<OutcomeFilter>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL");
  const [provinceFilter, setProvinceFilter] = React.useState("");

  const provinces = React.useMemo(() => Array.from(new Set(runs.map((r) => r.provinceCode))).sort(), [runs]);

  const filteredVisits = React.useMemo(
    () =>
      visits.filter((v) => {
        if (typeFilter !== "ALL" && v.visitType !== typeFilter) return false;
        if (outcomeFilter === "NONE") return !v.outcomeCode;
        if (outcomeFilter !== "ALL" && outcomeBucket(v.outcomeCode) !== outcomeFilter) return false;
        return true;
      }),
    [visits, typeFilter, outcomeFilter],
  );
  const filteredRuns = React.useMemo(() => runs.filter((r) => !provinceFilter || r.provinceCode === provinceFilter), [runs, provinceFilter]);

  const hasVisitFilters = outcomeFilter !== "ALL" || typeFilter !== "ALL";
  const clearVisitFilters = () => {
    setOutcomeFilter("ALL");
    setTypeFilter("ALL");
  };

  const visitColumns = React.useMemo<GridColDef<LoggedVisitRow>[]>(
    () => [
      {
        field: "accountName",
        headerName: "Account",
        flex: 1.3,
        minWidth: 240,
        valueGetter: (_v, row) => `${row.accountName} ${row.city ?? ""}`,
        sortComparator: (a, b) => String(a).localeCompare(String(b)),
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, py: 1 }}>
            <AccountTile name={row.accountName} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {row.accountName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                {row.city ?? "—"}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "visitDate",
        headerName: "Date",
        width: 160,
        valueGetter: (v) => new Date(v as string).getTime(),
        renderCell: ({ row }) => <DateCell iso={row.visitDate} fmt={visitDateFmt} now={now} />,
      },
      {
        field: "visitType",
        headerName: "Type",
        width: 140,
        type: "singleSelect",
        valueOptions: Object.entries(VISIT_TYPE_LABEL).map(([value, label]) => ({ value, label })),
        renderCell: ({ value }) => <StatusChip dot={false} tone="primary" label={VISIT_TYPE_LABEL[String(value)] ?? String(value)} />,
      },
      {
        field: "outcomeLabel",
        headerName: "Outcome",
        width: 230,
        renderCell: ({ row }) =>
          row.outcomeLabel ? (
            <StatusChip tone={row.outcomeCode ? (OUTCOME_TONE[row.outcomeCode] ?? "neutral") : "neutral"} label={row.outcomeLabel} />
          ) : (
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              No outcome
            </Typography>
          ),
      },
      {
        field: "fitScore",
        headerName: "Fit",
        type: "number",
        width: 100,
        align: "left",
        headerAlign: "left",
        renderCell: ({ row }) => <FitMeter score={row.fitScore} />,
      },
      {
        field: "nextAction",
        headerName: "Next action",
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) =>
          row.nextAction ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, color: "text.primary" }}>
              <ArrowForwardRounded sx={{ fontSize: 16, color: "warning.main", flexShrink: 0 }} aria-hidden />
              <Typography variant="body2" noWrap>
                {row.nextAction}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              —
            </Typography>
          ),
      },
    ],
    [now],
  );

  const routeColumns = React.useMemo<GridColDef<PlannedRouteRow>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "Planned",
        width: 170,
        valueGetter: (v) => new Date(v as string).getTime(),
        renderCell: ({ row }) => <DateCell iso={row.createdAt} fmt={dateFmt} now={now} />,
      },
      { field: "provinceCode", headerName: "Province", width: 110, renderCell: ({ value }) => <CodeChip label={value as string} /> },
      {
        field: "stopCount",
        headerName: "Stops",
        type: "number",
        width: 150,
        align: "left",
        headerAlign: "left",
        renderCell: ({ row }) => {
          const ratio = row.dailyVisitTarget ? Math.min(1, row.stopCount / row.dailyVisitTarget) : 0;
          return (
            <Box sx={{ display: "grid", gap: 1, width: 1, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {row.stopCount}
                <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
                  of {row.dailyVisitTarget} target
                </Typography>
              </Typography>
              <Box aria-hidden sx={{ height: 4, borderRadius: 2, bgcolor: "grey.200", overflow: "hidden", maxWidth: 96 }}>
                <Box sx={{ height: 1, width: `${ratio * 100}%`, bgcolor: ratio >= 1 ? "success.main" : "primary.main", borderRadius: 2 }} />
              </Box>
            </Box>
          );
        },
      },
      {
        field: "startQuery",
        headerName: "Start",
        flex: 1,
        minWidth: 200,
        renderCell: ({ value }) => (
          <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
            {String(value)}
          </Typography>
        ),
      },
      {
        field: "totalDriveMinutes",
        headerName: "Driving",
        type: "number",
        width: 110,
        align: "left",
        headerAlign: "left",
        valueFormatter: (v) => (v == null ? "—" : duration(v as number)),
      },
      { field: "dayStartClock", headerName: "Day start", width: 110, valueFormatter: (v) => (v ? clock12(v as string) : "—") },
    ],
    [now],
  );

  const visitFilters = (
    <>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)} inputProps={{ "aria-label": "Filter by outcome" }} sx={filterSx(outcomeFilter === "ALL")}>
          <MenuItem value="ALL">All outcomes</MenuItem>
          {OUTCOME_BUCKETS.map((b) => (
            <MenuItem key={b.key} value={b.key}>
              <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: b.color, mr: 2 }} />
              {b.label}
            </MenuItem>
          ))}
          <MenuItem value="NONE">No outcome yet</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} inputProps={{ "aria-label": "Filter by visit type" }} sx={filterSx(typeFilter === "ALL")}>
          <MenuItem value="ALL">Any type</MenuItem>
          {Object.entries(VISIT_TYPE_LABEL).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {hasVisitFilters && (
        <Button size="small" variant="text" onClick={clearVisitFilters}>
          Clear
        </Button>
      )}
    </>
  );

  const routeFilters =
    provinces.length > 1 ? (
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} displayEmpty inputProps={{ "aria-label": "Filter by province" }} sx={filterSx(provinceFilter === "")}>
          <MenuItem value="">Any province</MenuItem>
          {provinces.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    ) : undefined;

  return (
    <>
      <PageHeader
        title="Visit History"
        description="Routes you planned and visits you logged, most recent first. Quality visits and written next actions are what move the leaderboard."
        actions={
          canPlan ? (
            <HeroButton component={Link} href="/" startIcon={<RouteOutlined />}>
              Plan today&apos;s route
            </HeroButton>
          ) : undefined
        }
      />
      {targets}
      <Box sx={{ display: "grid", gap: 6 }}>
        <VisitStats runs={runs} visits={visits} />

        <Box sx={{ animation: `${rise} 480ms ${EASE} 240ms both`, [REDUCED]: { animation: "none" } }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Visit history sections" sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
            <Tab value="visits" label={`Logged visits · ${visits.length}`} />
            <Tab value="routes" label={`Planned routes · ${runs.length}`} />
          </Tabs>
          {tab === "visits" ? (
            <DataTable<LoggedVisitRow>
              rows={filteredVisits}
              columns={visitColumns}
              label="Logged visits"
              searchPlaceholder="Search account or city"
              filters={visitFilters}
              initialSort={[{ field: "visitDate", sort: "desc" }]}
              emptyState={
                hasVisitFilters
                  ? { illustration: "search", title: "No visits match", description: "Try a different search or clear the filters.", action: <Chip label="Clear filters" size="small" onClick={clearVisitFilters} variant="outlined" /> }
                  : { illustration: "inbox", title: "No visits logged yet", description: "Visits you record from a clinic brief show up here." }
              }
              gridProps={{ rowHeight: 60, sx: tableSx }}
            />
          ) : (
            <DataTable<PlannedRouteRow>
              rows={filteredRuns}
              columns={routeColumns}
              label="Planned routes"
              searchPlaceholder="Search start address"
              filters={routeFilters}
              initialSort={[{ field: "createdAt", sort: "desc" }]}
              emptyState={{
                illustration: "map",
                title: "No planned routes yet",
                description: "Build one from Today's Route and it will appear here.",
                action: canPlan ? (
                  <Button component={Link} href="/" variant="contained" size="small">
                    Go to Today
                  </Button>
                ) : undefined,
              }}
              gridProps={{ rowHeight: 60, sx: tableSx }}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
