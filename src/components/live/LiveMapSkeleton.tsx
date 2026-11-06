import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { StatStrip } from "@/components/feedback/MiniStatCard";
import { MapLoading } from "@/components/today/mapChrome";
import { LAYOUT } from "@/theme/tokens";

/** Same as LiveMap's PANEL_WIDTH. */
const PANEL_WIDTH = 340;
const TARGET_CARDS = 4;
const REP_ROWS = 6;

/**
 * Loading state for the Live Map, laid out like LiveMap: status bar (live dot,
 * status chips, province + Fit all), the team target strip over the map, and
 * the rep panel (search + rep rows) on the right. Same boxes and spacing as
 * LiveMap / TargetStrip / MiniStatCard / RepPanel so nothing jumps on arrival.
 */
export function LiveMapSkeleton() {
  return (
    <Box
      aria-busy="true"
      aria-live="polite"
      sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", maxHeight: { md: `calc(100dvh - ${LAYOUT.headerHeight}px)` } }}
    >
      {/* Status bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          px: { xs: 4, md: 6 },
          py: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flexWrap: "wrap" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Skeleton variant="rounded" width={30} height={14} />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {[84, 100, 64].map((w) => (
              <Skeleton key={w} variant="rounded" width={w} height={20} sx={{ borderRadius: 999 }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <Skeleton variant="rounded" width={170} height={36} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={84} height={32} sx={{ borderRadius: 2 }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: { xs: "column", md: "row" } }}>
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
          {/* Team target strip */}
          <StatStrip
            ariaLabel="Loading team targets"
            header={
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                <Skeleton variant="rounded" width={56} height={11} />
                <Skeleton variant="rounded" width={180} height={14} />
              </Box>
            }
          >
            {Array.from({ length: TARGET_CARDS }).map((_, i) => (
              <TargetCardSkeleton key={i} />
            ))}
          </StatStrip>

          {/* Map */}
          <Box sx={{ position: "relative", minHeight: 280, height: { xs: "52dvh", md: "auto" }, flex: 1 }}>
            <MapLoading />
          </Box>
        </Box>

        {/* Rep panel */}
        <Box
          component="aside"
          sx={{
            width: { xs: 1, md: PANEL_WIDTH },
            flexShrink: 0,
            minHeight: 0,
            borderLeft: { md: 1 },
            borderTop: { xs: 1, md: 0 },
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: 1, borderColor: "divider" }}>
            <Skeleton variant="rounded" height={36} sx={{ borderRadius: 2 }} />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", p: 2, display: "grid", gap: 1, alignContent: "start" }}>
            {Array.from({ length: REP_ROWS }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 3, px: 3, py: 2.5, opacity: 1 - i * 0.12 }}>
                <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0, mt: 0.5 }} />
                <Box sx={{ flex: 1, minWidth: 0, display: "grid", gap: 0.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: 20 }}>
                    <Skeleton variant="rounded" height={13} sx={{ flex: 1, maxWidth: 140 }} />
                    <Skeleton variant="rounded" width={28} height={18} sx={{ ml: "auto" }} />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: 20 }}>
                    <Skeleton variant="rounded" width={76} height={20} sx={{ borderRadius: 999 }} />
                    <Skeleton variant="rounded" width={56} height={11} />
                  </Box>
                  <Skeleton variant="rounded" width="75%" height={11} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mirrors MiniStatCard (default, non-dense): eyebrow + icon tile, value / target + chip, bar, footer. */
function TargetCardSkeleton() {
  return (
    <Card sx={{ px: 3.5, py: 3, display: "grid", gap: 2, alignContent: "start", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Skeleton variant="rounded" width={96} height={10} />
        <Skeleton variant="rounded" width={26} height={26} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, height: 22 }}>
        <Skeleton variant="rounded" width={44} height={20} />
        <Skeleton variant="rounded" width={68} height={18} sx={{ borderRadius: 999 }} />
      </Box>
      <Skeleton variant="rounded" height={5} sx={{ borderRadius: 999 }} />
      <Box sx={{ height: 18, display: "flex", alignItems: "center" }}>
        <Skeleton variant="rounded" width={120} height={12} />
      </Box>
    </Card>
  );
}
