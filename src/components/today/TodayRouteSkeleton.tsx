import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { StatStrip } from "@/components/feedback/MiniStatCard";
import { MapLoading } from "@/components/today/mapChrome";
import { LAYOUT } from "@/theme/tokens";

/**
 * Loading state for Today's Route, laid out like the page's first paint:
 * the month strip (dense stat cards), the map, and the planner panel with the
 * "My day" bar and the "Where are you right now?" step. Same boxes and spacing
 * as TodayRoute / MonthStrip / MyDayPanel / PlanningWorkspace so nothing jumps
 * when the real page arrives.
 */
export function TodayRouteSkeleton() {
  return (
    <Box
      aria-busy="true"
      aria-live="polite"
      sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", maxHeight: { md: `calc(100dvh - ${LAYOUT.headerHeight}px)` } }}
    >
      <StatStrip ariaLabel="Loading this month" dense>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} withTarget={i > 0} />
        ))}
      </StatStrip>

      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: { xs: "column", md: "row" } }}>
        {/* Map */}
        <Box sx={{ position: "relative", minHeight: 280, height: { xs: "46dvh", md: "auto" }, flex: "1 1 0%" }}>
          <MapLoading />
        </Box>

        {/* Phone sheet header */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="rounded" width={160} height={18} />
            <Skeleton variant="rounded" width={220} height={12} sx={{ mt: 1, maxWidth: 1 }} />
          </Box>
          <Skeleton variant="rounded" width={36} height={14} />
        </Box>

        {/* Planner panel */}
        <Box
          component="aside"
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            width: { xs: 1, md: "32%", lg: "28%" },
            minWidth: { md: 300 },
            maxWidth: { md: 380 },
            maxHeight: { xs: "52dvh", md: "none" },
            borderTop: { xs: 1, md: 0 },
            borderLeft: { md: 1 },
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          {/* My day bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              px: 4,
              py: 2.5,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Skeleton variant="rounded" width={150} height={11} />
            <Skeleton variant="rounded" width={72} height={20} sx={{ borderRadius: 999 }} />
          </Box>

          {/* Start step */}
          <Box sx={{ flex: 1, px: { xs: 4, sm: 5 }, py: 4 }}>
            {/* h3 title (24px), then three body2 lines at 1.6 line-height (20.8px each) */}
            <Box sx={{ height: 24, display: "flex", alignItems: "center" }}>
              <Skeleton variant="rounded" width={200} height={18} />
            </Box>
            <Box sx={{ mt: 1, display: "grid", gridAutoRows: "20.8px", alignItems: "center" }}>
              <Skeleton variant="rounded" height={12} />
              <Skeleton variant="rounded" height={12} />
              <Skeleton variant="rounded" width="70%" height={12} />
            </Box>
            <Box sx={{ mt: 4, display: "grid", gap: 2 }}>
              <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2, opacity: 0.6 }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mirrors MiniStatCard's dense layout: eyebrow + icon tile, value (+ chip), bar, footer. */
function StatCardSkeleton({ withTarget }: { withTarget: boolean }) {
  return (
    <Card sx={{ px: 3, py: 2, display: "grid", gap: 1.25, alignContent: "start", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Skeleton variant="rounded" width={96} height={10} />
        <Skeleton variant="rounded" width={20} height={20} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, height: 20.3 }}>
        <Skeleton variant="rounded" width={withTarget ? 40 : 20} height={18} />
        {withTarget && <Skeleton variant="rounded" width={64} height={16} sx={{ borderRadius: 999 }} />}
      </Box>
      {withTarget ? <Skeleton variant="rounded" height={4} sx={{ borderRadius: 999 }} /> : <Box sx={{ height: 4 }} />}
      <Box sx={{ height: 15.4, display: "flex", alignItems: "center" }}>
        <Skeleton variant="rounded" width={112} height={11} />
      </Box>
    </Card>
  );
}
