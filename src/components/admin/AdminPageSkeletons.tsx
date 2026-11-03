import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

/** Mirrors AdminTabs: three tab labels on a 40px rail with the indicator under the active tab. */
export function AdminTabsSkeleton({ active = 0 }: { active?: 0 | 1 | 2 }) {
  return (
    <Box
      sx={{
        mb: 6,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        height: 40,
      }}
    >
      {[36, 100, 60].map((w, i) => (
        <Box
          key={i}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            px: 1.5,
          }}
        >
          <Skeleton variant="rounded" width={w} height={13} />
          {i === active && (
            <Skeleton
              variant="rounded"
              height={2}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 2,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Mirrors PageHeader: the h1 title, one or two description lines, and optional right-hand actions. */
export function PageHeaderSkeleton({ title, lines, actions }: { title: number; lines: number[]; actions?: React.ReactNode }) {
  return (
    <Box
      sx={{
        mb: 6,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "flex-start" },
        justifyContent: "space-between",
        gap: 3,
      }}
    >
      <Box sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
        <Skeleton variant="rounded" width={title} height={28} />
        {lines.map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={14} sx={{ maxWidth: "80vw", mt: i === 0 ? 0.5 : 0 }} />
        ))}
      </Box>
      {actions}
    </Box>
  );
}

/** Mirrors KpiCard: eyebrow + icon tile, the headline value, and an optional hint line. */
export function KpiCardSkeleton({ label = 96, value = 72, hint = [] }: { label?: number; value?: number; hint?: number | number[] }) {
  const hints = typeof hint === "number" ? (hint > 0 ? [hint] : []) : hint;
  return (
    <Box
      sx={{
        px: 5,
        py: 4,
        display: "grid",
        gap: 3,
        alignContent: "start",
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Skeleton variant="rounded" width={label} height={12} sx={{ mt: "2px" }} />
        <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Skeleton variant="rounded" width={value} height={28} sx={{ my: "2px" }} />
      {hints.length > 0 && (
        <Box sx={{ display: "grid" }}>
          {hints.map((w, i) => (
            <Skeleton key={i} variant="rounded" width={w} height={13} sx={{ my: "3px", maxWidth: "100%" }} />
          ))}
        </Box>
      )}
    </Box>
  );
}

/** A DataGrid header row: one label per column on the grid's track. `height` is 56 standard / 39 compact. */
export function GridHeaderSkeleton({ columns, widths, height = 56 }: { columns: string; widths: number[]; height?: number }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columns,
        alignItems: "center",
        height,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {widths.map((w, i) => (
        <Box key={i} sx={{ px: "10px" }}>
          {w > 0 && <Skeleton variant="rounded" width={w} height={10} />}
        </Box>
      ))}
    </Box>
  );
}

/** A DataGrid cell: 10px side padding, vertically centred, clipped like the real one. */
export function GridCell({ children, justify = "flex-start", gap = 3 }: { children: React.ReactNode; justify?: "flex-start" | "flex-end"; gap?: number }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap,
        px: "10px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

/** Row wrapper on the grid's track; rows fade toward the bottom like the other skeletons. */
export function GridRow({ columns, height, index, last, children }: { columns: string; height: number; index: number; last: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columns,
        alignItems: "center",
        height,
        borderBottom: last ? 0 : 1,
        borderColor: "divider",
        opacity: Math.max(0.35, 1 - index * 0.09),
      }}
    >
      {children}
    </Box>
  );
}

/** Deterministic "random" width so rows look like data without changing between renders. */
export const vary = (base: number, index: number, seed: number, spread: number) => base + ((index * seed) % spread);
