import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { PageContainer } from "./PageContainer";

/** Generic loading state: header + optional KPI row + table shell. */
export function PageSkeleton({ kpis = 0, rows = 8, columns = 5, toolbar = true }: { kpis?: number; rows?: number; columns?: number; toolbar?: boolean }) {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <Box sx={{ mb: 6, display: "grid", gap: 2 }}>
        <Skeleton variant="rounded" width={192} height={28} />
        <Skeleton variant="rounded" width={320} height={16} sx={{ maxWidth: 1 }} />
      </Box>
      {kpis > 0 && (
        <Box sx={{ mb: 6, display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: `repeat(${kpis}, 1fr)` } }}>
          {Array.from({ length: kpis }).map((_, i) => (
            <Card key={i} sx={{ p: 5 }}>
              <Skeleton variant="rounded" width={96} height={12} sx={{ mb: 3 }} />
              <Skeleton variant="rounded" width={64} height={28} />
            </Card>
          ))}
        </Box>
      )}
      <TableSkeleton rows={rows} columns={columns} toolbar={toolbar} />
    </PageContainer>
  );
}

export function TableSkeleton({ rows = 8, columns = 5, toolbar = true }: { rows?: number; columns?: number; toolbar?: boolean }) {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {toolbar && (
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
          <Skeleton variant="rounded" width={256} height={36} />
          <Skeleton variant="rounded" width={112} height={36} />
        </Box>
      )}
      <Card sx={{ overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 4, px: 4, py: 3, borderBottom: 1, borderColor: "divider" }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={12} sx={{ flex: 1 }} />
          ))}
        </Box>
        {Array.from({ length: rows }).map((_, r) => (
          <Box key={r} sx={{ display: "flex", alignItems: "center", gap: 4, px: 4, py: 3, borderBottom: r < rows - 1 ? 1 : 0, borderColor: "divider", opacity: 1 - r * 0.08 }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} variant="rounded" height={16} sx={{ flex: 1 }} />
            ))}
          </Box>
        ))}
      </Card>
    </Box>
  );
}
