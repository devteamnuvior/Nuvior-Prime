import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabsSkeleton, GridCell, GridHeaderSkeleton, GridRow, KpiCardSkeleton, vary } from "../AdminPageSkeletons";

/** Mirrors RepProfileView's Section: a card with the h3 title, a caption hint, then the content. */
function SectionSkeleton({ title, hint, children }: { title: number; hint: number; children: React.ReactNode }) {
  return (
    <Card
      component="section"
      sx={{
        px: 5,
        py: 4,
        display: "grid",
        gap: 4,
        minWidth: 0,
        alignContent: "start",
      }}
    >
      <Box sx={{ display: "grid", gap: 1 }}>
        <Skeleton variant="rounded" width={title} height={16} sx={{ my: "4px" }} />
        <Skeleton variant="rounded" width={hint} height={12} sx={{ my: "2.5px", maxWidth: "80vw" }} />
      </Box>
      {children}
    </Card>
  );
}

/** Mirrors Stat: caption label over an h2 number. */
function StatSkeleton({ label, value = 44 }: { label: number; value?: number }) {
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      <Skeleton variant="rounded" width={label} height={12} sx={{ my: "2.5px" }} />
      <Skeleton variant="rounded" width={value} height={22} sx={{ my: "3px" }} />
    </Box>
  );
}

/** Mirrors DetailRow: icon tile, small label, value (a province badge on the territory row). */
function DetailRowSkeleton({ label, value, badge = false }: { label: number; value: number; badge?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        px: 2,
        py: 1.5,
        minWidth: 0,
      }}
    >
      <Skeleton variant="rounded" width={30} height={30} sx={{ borderRadius: 2, flexShrink: 0 }} />
      <Box sx={{ display: "grid", gap: badge ? 1 : 0.5, minWidth: 0 }}>
        <Skeleton variant="rounded" width={label} height={10} sx={{ my: "2.5px" }} />
        {badge ? <Skeleton variant="rounded" width={40} height={32} sx={{ borderRadius: 1 }} /> : <Skeleton variant="rounded" width={value} height={13} sx={{ my: "3px" }} />}
      </Box>
    </Box>
  );
}

/** Mirrors the weekly line chart: legend, y-axis ticks, grid lines and a soft area under the line. */
function LineChartSkeleton() {
  const heights = [36, 58, 44, 92, 70, 118, 96, 140, 112, 158, 126, 170, 150];
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          gap: 4,
          mb: 2,
          height: 18,
          alignItems: "center",
        }}
      >
        {[48, 140, 90].map((w, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="rounded" width={14} height={10} sx={{ borderRadius: 0.5 }} />
            <Skeleton variant="rounded" width={w} height={11} />
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "28px 1fr",
          gap: 2,
          height: 260,
        }}
      >
        <Box
          sx={{
            display: "grid",
            alignContent: "space-between",
            pb: "28px",
            pt: "8px",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={18} height={9} sx={{ justifySelf: "end" }} />
          ))}
        </Box>
        <Box
          sx={{
            position: "relative",
            borderBottom: 1,
            borderColor: "divider",
            mb: "28px",
            mt: "8px",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(i / 4) * 100}%`,
                borderTop: 1,
                borderColor: "divider",
                opacity: 0.6,
              }}
            />
          ))}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              px: 1,
            }}
          >
            {heights.map((h, i) => (
              <Skeleton key={i} variant="rounded" width={10} height={h} sx={{ borderRadius: "5px 5px 0 0", opacity: 0.55 }} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mirrors FunnelBars: five labelled steps, each with a bar that narrows down the funnel. */
function FunnelSkeleton() {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {[100, 84, 62, 38, 20].map((pct, i) => (
        <Box key={i}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
              height: 19,
            }}
          >
            <Skeleton variant="rounded" width={vary(96, i, 41, 60)} height={13} />
            <Skeleton variant="rounded" width={i === 0 ? 24 : 56} height={13} />
          </Box>
          <Box
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "background.sunken",
              overflow: "hidden",
            }}
          >
            <Skeleton variant="rounded" width={`${pct}%`} height={8} sx={{ borderRadius: 4 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Mirrors ProductMixChart: horizontal bars with a 150px label gutter and an x-axis. */
function BarChartSkeleton() {
  const rows = [88, 64, 42, 26];
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        height: rows.length * 44 + 40,
        alignContent: "start",
        pt: 1,
      }}
    >
      {rows.map((pct, i) => (
        <Box
          key={i}
          sx={{
            display: "grid",
            gridTemplateColumns: "150px 1fr",
            alignItems: "center",
            gap: 2,
            height: 40,
          }}
        >
          <Skeleton variant="rounded" width={vary(84, i, 29, 50)} height={11} sx={{ justifySelf: "end", mr: 2 }} />
          <Skeleton variant="rounded" width={`${pct}%`} height={28} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "150px 1fr",
          gap: 2,
          pt: 1,
        }}
      >
        <Box />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: 1,
            borderColor: "divider",
            pt: 1.5,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={20} height={9} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/** Mirrors ActivityCalendar: a 90-day week-by-weekday grid with month labels and the Less → More legend. */
function CalendarSkeleton({ weeks = 13 }: { weeks?: number }) {
  return (
    <Box sx={{ overflowX: "hidden" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `28px repeat(${weeks}, 14px)`,
          gap: "3px",
          alignItems: "center",
        }}
      >
        <Box />
        {Array.from({ length: weeks }).map((_, i) => (
          <Box key={i} sx={{ height: 12 }}>
            {i % 4 === 1 && <Skeleton variant="rounded" width={22} height={9} />}
          </Box>
        ))}
        {Array.from({ length: 7 }).map((_, row) => (
          <Box key={row} sx={{ display: "contents" }}>
            <Box sx={{ height: 12 }}>{row % 2 === 0 && row < 5 && <Skeleton variant="rounded" width={20} height={9} />}</Box>
            {Array.from({ length: weeks }).map((_, col) => (
              <Skeleton
                key={col}
                variant="rounded"
                width={12}
                height={12}
                sx={{
                  borderRadius: 0.5,
                  opacity: ((row * 7 + col * 3) % 5) / 5 + 0.3,
                }}
              />
            ))}
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 2,
          justifyContent: "flex-end",
        }}
      >
        <Skeleton variant="rounded" width={22} height={9} sx={{ mr: 0.5 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={10} height={10} sx={{ borderRadius: 0.5 }} />
        ))}
        <Skeleton variant="rounded" width={26} height={9} sx={{ ml: 0.5 }} />
      </Box>
    </Box>
  );
}

const VISIT_COLUMNS = "130px minmax(200px, 1.2fr) 150px 220px 70px 130px minmax(200px, 1fr)";
const ROUTE_COLUMNS = "160px 100px 80px 100px minmax(200px, 1fr) 100px";

function VisitRowSkeleton({ index, last }: { index: number; last: boolean }) {
  return (
    <GridRow columns={VISIT_COLUMNS} height={52} index={index} last={last}>
      <GridCell>
        <Skeleton variant="rounded" width={96} height={13} />
      </GridCell>
      <GridCell>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Skeleton variant="rounded" width={vary(130, index, 37, 60)} height={13} />
          <Skeleton variant="rounded" width={vary(56, index, 19, 30)} height={11} />
        </Box>
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={index % 2 ? 84 : 66} height={20} sx={{ borderRadius: 999 }} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(104, index, 31, 60)} height={20} sx={{ borderRadius: 999 }} />
      </GridCell>
      <GridCell justify="flex-end">
        <Skeleton variant="rounded" width={12} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={index % 3 === 2 ? 10 : 92} height={20} sx={{ borderRadius: 999 }} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(140, index, 23, 80)} height={13} />
      </GridCell>
    </GridRow>
  );
}

function RouteRowSkeleton({ index, last }: { index: number; last: boolean }) {
  return (
    <GridRow columns={ROUTE_COLUMNS} height={52} index={index} last={last}>
      <GridCell>
        <Skeleton variant="rounded" width={118} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={34} height={20} sx={{ borderRadius: 1 }} />
      </GridCell>
      <GridCell justify="flex-end">
        <Skeleton variant="rounded" width={14} height={13} />
      </GridCell>
      <GridCell justify="flex-end">
        <Skeleton variant="rounded" width={14} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(180, index, 29, 90)} height={13} />
      </GridCell>
      <GridCell justify="flex-end">
        <Skeleton variant="rounded" width={44} height={13} />
      </GridCell>
    </GridRow>
  );
}

/** Recent-visits grid alone (no toolbar). Also shown by RecentVisitsTable before the grid mounts. */
export function RecentVisitsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <GridHeaderSkeleton columns={VISIT_COLUMNS} widths={[30, 54, 30, 56, 20, 60, 72]} />
      {Array.from({ length: rows }).map((_, i) => (
        <VisitRowSkeleton key={i} index={i} last={i === rows - 1} />
      ))}
    </Card>
  );
}

/** Recent-routes grid alone (no toolbar). Also shown by RecentRoutesTable before the grid mounts. */
export function RecentRoutesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <GridHeaderSkeleton columns={ROUTE_COLUMNS} widths={[30, 56, 36, 60, 34, 46]} />
      {Array.from({ length: rows }).map((_, i) => (
        <RouteRowSkeleton key={i} index={i} last={i === rows - 1} />
      ))}
    </Card>
  );
}

/** Loading state for a team member's Performance page, laid out exactly like RepProfileView so nothing jumps when data lands. */
export function RepProfileSkeleton() {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <AdminTabsSkeleton active={0} />

      {/* "All team members" back link */}
      <Skeleton variant="rounded" width={160} height={32} sx={{ mb: 3, borderRadius: 2 }} />

      {/* Identity card: tinted band with ringed avatar, role, name + chips, email, range toggle; then five detail rows */}
      <Card sx={{ overflow: "hidden", mb: 6 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 4,
            px: 5,
            pt: 5,
            pb: 4,
            bgcolor: "background.sunken",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <Skeleton variant="circular" width={72} height={72} sx={{ flexShrink: 0 }} />
            <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
              <Skeleton variant="rounded" width={64} height={11} sx={{ my: "2.5px" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Skeleton variant="rounded" width={220} height={24} sx={{ my: "2px" }} />
                <Skeleton variant="rounded" width={58} height={20} sx={{ borderRadius: 999 }} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton variant="rounded" width={16} height={16} sx={{ borderRadius: 0.5 }} />
                <Skeleton variant="rounded" width={160} height={13} sx={{ my: "3px" }} />
              </Box>
            </Box>
          </Box>
          <Skeleton variant="rounded" width={239} height={39} sx={{ borderRadius: 2 }} />
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(5, minmax(0, 1fr))",
            },
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 2.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <DetailRowSkeleton label={26} value={92} />
          <DetailRowSkeleton label={52} value={0} badge />
          <DetailRowSkeleton label={58} value={74} />
          <DetailRowSkeleton label={70} value={84} />
          <DetailRowSkeleton label={36} value={150} />
        </Box>
      </Card>

      <Box sx={{ display: "grid", gap: 6 }}>
        {/* KPI tiles, each with a one- or two-line hint */}
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <KpiCardSkeleton label={92} value={56} hint={[220, 90]} />
          <KpiCardSkeleton label={98} value={56} hint={[190]} />
          <KpiCardSkeleton label={84} value={56} hint={[230, 60]} />
          <KpiCardSkeleton label={104} value={40} hint={[210]} />
        </Box>

        <SectionSkeleton title={110} hint={520}>
          <LineChartSkeleton />
        </SectionSkeleton>

        <Box
          sx={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <SectionSkeleton title={52} hint={300}>
            <FunnelSkeleton />
          </SectionSkeleton>
          <SectionSkeleton title={120} hint={380}>
            <BarChartSkeleton />
          </SectionSkeleton>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1.4fr) minmax(0, 1fr)",
            },
          }}
        >
          <SectionSkeleton title={58} hint={270}>
            <CalendarSkeleton />
          </SectionSkeleton>
          <SectionSkeleton title={52} hint={330}>
            <Box
              sx={{
                display: "grid",
                gap: 4,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <StatSkeleton label={104} />
              <StatSkeleton label={110} />
              <StatSkeleton label={130} />
              <StatSkeleton label={112} value={24} />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                pt: 3,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              {[86, 110, 72, 98].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={20} sx={{ borderRadius: 999 }} />
              ))}
            </Box>
          </SectionSkeleton>
        </Box>

        <SectionSkeleton title={56} hint={330}>
          {/* Progress cards, one per active target */}
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
            }}
          >
            {[80, 150, 160, 170, 150].map((w, i) => (
              <Box
                key={i}
                sx={{
                  p: 3,
                  borderRadius: 1.5,
                  bgcolor: "background.sunken",
                  display: "grid",
                  gap: 1,
                }}
              >
                <Skeleton variant="rounded" width={w} height={12} sx={{ my: "2.5px" }} />
                <Skeleton variant="rounded" width={40} height={16} sx={{ my: "4px" }} />
                <Skeleton variant="rounded" width={i > 2 ? 74 : 58} height={20} sx={{ borderRadius: 999 }} />
              </Box>
            ))}
          </Box>
          {/* Target list, then the add-target form */}
          <Box sx={{ display: "grid", gap: 4 }}>
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {[160, 90, 180, 150, 180].map((w, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    px: 3,
                    py: 2,
                    borderRadius: 1.5,
                    bgcolor: i === 0 ? "action.selected" : "background.sunken",
                    height: 52,
                  }}
                >
                  <Box sx={{ flex: 1, display: "grid", gap: 0.5 }}>
                    <Skeleton variant="rounded" width={w} height={13} />
                    <Skeleton variant="rounded" width={130} height={11} />
                  </Box>
                  <Skeleton variant="rounded" width={14} height={16} />
                  <Skeleton variant="rounded" width={56} height={20} sx={{ borderRadius: 999 }} />
                  <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "50%" }} />
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                pt: 3,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={37} sx={{ borderRadius: 2 }} />
              ))}
              <Box
                sx={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Skeleton variant="rounded" width={108} height={36} sx={{ borderRadius: 2 }} />
              </Box>
            </Box>
          </Box>
        </SectionSkeleton>

        <SectionSkeleton title={94} hint={190}>
          <RecentVisitsTableSkeleton />
        </SectionSkeleton>

        <SectionSkeleton title={96} hint={230}>
          <RecentRoutesTableSkeleton />
        </SectionSkeleton>

        <SectionSkeleton title={52} hint={290}>
          <Box sx={{ display: "grid", gap: 1 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  alignItems: "center",
                  gap: 3,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  opacity: Math.max(0.4, 1 - i * 0.12),
                }}
              >
                <Skeleton variant="rounded" width={92} height={12} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Skeleton variant="rounded" width={vary(76, i, 23, 40)} height={20} sx={{ borderRadius: 999 }} />
                  <Skeleton variant="rounded" width={vary(110, i, 31, 60)} height={12} />
                </Box>
                <Skeleton variant="rounded" width={120} height={12} />
              </Box>
            ))}
          </Box>
        </SectionSkeleton>
      </Box>
    </PageContainer>
  );
}
