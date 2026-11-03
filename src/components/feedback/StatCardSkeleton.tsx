import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";

/**
 * Mirrors StatCard: eyebrow + icon tile, the headline number, and one of the footer shapes the
 * stat tiles use. `legend` is the width of each legend label under the "legend" footer.
 */
export function StatCardSkeleton({ footer, legend = [52, 72, 68, 80] }: { footer: "legend" | "ring" | "line" | "bar"; legend?: number[] }) {
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
            {legend.map((w, i) => (
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
