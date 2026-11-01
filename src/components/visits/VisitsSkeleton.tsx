import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { PageContainer } from "@/components/layout/PageContainer";

/** Mirrors StatCard: eyebrow + icon tile, the headline number, and a footer bar with legend. */
function StatCardSkeleton({ footer }: { footer: "legend" | "ring" | "line" | "bar" }) {
  return (
    <Card sx={{ px: 5, py: 4, display: "grid", gap: 3, alignContent: "start" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
        <Skeleton variant="rounded" width={104} height={12} sx={{ mt: "2px" }} />
        <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 3 }}>
        <Skeleton variant="rounded" width={56} height={32} />
        {footer === "ring" && <Skeleton variant="circular" width={44} height={44} />}
      </Box>
      {footer === "legend" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Skeleton variant="rounded" height={6} sx={{ borderRadius: 999 }} />
          <Box sx={{ display: "flex", gap: 3 }}>
            {[52, 72, 68, 80].map((w, i) => (
              <Skeleton key={i} variant="rounded" width={w} height={12} />
            ))}
          </Box>
        </Box>
      )}
      {footer === "bar" && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Skeleton variant="rounded" height={6} sx={{ borderRadius: 999 }} />
          <Skeleton variant="rounded" width={168} height={14} />
        </Box>
      )}
      {(footer === "ring" || footer === "line") && <Skeleton variant="rounded" width={152} height={14} />}
    </Card>
  );
}

/** Mirrors a target card: eyebrow, "actual / target", progress bar, status chip + note. */
function TargetCardSkeleton() {
  return (
    <Card sx={{ px: 5, py: 4, display: "grid", gap: 2 }}>
      <Skeleton variant="rounded" width={132} height={12} />
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Skeleton variant="rounded" width={44} height={36} />
        <Skeleton variant="rounded" width={28} height={14} />
      </Box>
      <Skeleton variant="rounded" height={6} sx={{ borderRadius: 3 }} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Skeleton variant="rounded" width={64} height={22} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={88} height={12} />
      </Box>
    </Card>
  );
}

/** One table row with the shapes of the logged-visits columns: account tile, date, type, outcome, fit dots, next action. */
function VisitRowSkeleton({ index, last }: { index: number; last: boolean }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(240px, 1.3fr) 160px 140px 230px 100px minmax(220px, 1fr)", alignItems: "center", gap: 3, px: 4, height: 60, borderBottom: last ? 0 : 1, borderColor: "divider", opacity: Math.max(0.35, 1 - index * 0.09) }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 2, flexShrink: 0 }} />
        <Box sx={{ display: "grid", gap: 1 }}>
          <Skeleton variant="rounded" width={150 + ((index * 37) % 60)} height={14} />
          <Skeleton variant="rounded" width={72} height={12} />
        </Box>
      </Box>
      <Box sx={{ display: "grid", gap: 1 }}>
        <Skeleton variant="rounded" width={108} height={14} />
        <Skeleton variant="rounded" width={64} height={12} />
      </Box>
      <Skeleton variant="rounded" width={92} height={22} sx={{ borderRadius: 999 }} />
      <Skeleton variant="rounded" width={120 + ((index * 53) % 70)} height={22} sx={{ borderRadius: 999 }} />
      <Box sx={{ display: "flex", gap: "3px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="circular" width={8} height={8} />
        ))}
      </Box>
      <Skeleton variant="rounded" width={140 + ((index * 29) % 80)} height={14} />
    </Box>
  );
}

/** Loading state for Visit History, laid out exactly like the page so nothing jumps when data lands. */
export function VisitsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      {/* Page header: title, description, hero button */}
      <Box sx={{ mb: 6, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-start" }, justifyContent: "space-between", gap: 3 }}>
        <Box sx={{ display: "grid", gap: 2 }}>
          <Skeleton variant="rounded" width={176} height={28} />
          <Skeleton variant="rounded" width={460} height={16} sx={{ maxWidth: "80vw" }} />
        </Box>
        <Skeleton variant="rounded" width={188} height={40} sx={{ borderRadius: 999 }} />
      </Box>

      {/* Targets strip */}
      <Box sx={{ mb: 5 }}>
        <Skeleton variant="rounded" width={120} height={12} sx={{ mb: 2 }} />
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" } }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <TargetCardSkeleton key={i} />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 6 }}>
        {/* Stat tiles */}
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
          <StatCardSkeleton footer="legend" />
          <StatCardSkeleton footer="ring" />
          <StatCardSkeleton footer="line" />
          <StatCardSkeleton footer="bar" />
        </Box>

        {/* Tabs + table */}
        <Box>
          <Box sx={{ display: "flex", gap: 6, px: 3, mb: 3, borderBottom: 1, borderColor: "divider", height: 40, alignItems: "center" }}>
            <Skeleton variant="rounded" width={124} height={14} />
            <Skeleton variant="rounded" width={132} height={14} />
          </Box>
          <Card sx={{ overflow: "hidden" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 2, minHeight: 52, borderBottom: 1, borderColor: "divider" }}>
              <Skeleton variant="rounded" width={256} height={36} />
              <Skeleton variant="rounded" width={160} height={36} />
              <Skeleton variant="rounded" width={150} height={36} />
              <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                <Skeleton variant="rounded" width={32} height={32} />
                <Skeleton variant="rounded" width={32} height={32} />
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(240px, 1.3fr) 160px 140px 230px 100px minmax(220px, 1fr)", gap: 3, px: 4, py: 3, borderBottom: 1, borderColor: "divider" }}>
              {[64, 40, 40, 70, 24, 90].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={10} />
              ))}
            </Box>
            {Array.from({ length: rows }).map((_, i) => (
              <VisitRowSkeleton key={i} index={i} last={i === rows - 1} />
            ))}
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
}
