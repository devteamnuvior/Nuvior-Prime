import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { StatCardSkeleton } from "@/components/feedback/StatCardSkeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabsSkeleton } from "./AdminPageSkeletons";

/** Same track as the UsersTable columns: User, Role, Status, Territory, Level, Visits · 30d, Last Active, Added, row menu. */
const COLUMNS = "minmax(240px, 1.4fr) 150px 120px minmax(160px, 1fr) 190px 130px 140px 130px 56px";
/** Header label widths, in column order (the menu column has no label). */
const HEADER_WIDTHS = [34, 32, 46, 68, 40, 78, 76, 42, 0];
/** DataGrid cells carry 10px of horizontal padding; the toolbar sits at 52px, headers at 56px, rows at 60px. */
const CELL_PX = "10px";

function Cell({ children, justify = "flex-start" }: { children: React.ReactNode; justify?: "flex-start" | "flex-end" }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap: 3,
        px: CELL_PX,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

/** One table row with the shapes of the users columns: avatar + name/email, role pill, status chip, province badges, level, activity bars, two dates, row menu. */
function UserRowSkeleton({ index, last }: { index: number; last: boolean }) {
  const badges = (index % 3) + 1;
  const bars = [8, 14, 6, 18, 10, 22].map((h, i) => Math.max(3, ((h + index * 5 + i * 3) % 20) + 3));
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: COLUMNS,
        alignItems: "center",
        height: 60,
        borderBottom: last ? 0 : 1,
        borderColor: "divider",
        opacity: Math.max(0.35, 1 - index * 0.09),
      }}
    >
      <Cell>
        <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
        <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
          <Skeleton variant="rounded" width={110 + ((index * 37) % 60)} height={14} />
          <Skeleton variant="rounded" width={150 + ((index * 23) % 50)} height={12} />
        </Box>
      </Cell>
      <Cell>
        <Skeleton variant="rounded" width={124} height={28} sx={{ borderRadius: 999 }} />
      </Cell>
      <Cell>
        <Skeleton variant="rounded" width={index % 4 === 3 ? 74 : 64} height={20} sx={{ borderRadius: 999 }} />
      </Cell>
      <Cell>
        <Box sx={{ display: "flex", gap: 1 }}>
          {Array.from({ length: badges }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={40} height={32} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </Cell>
      <Cell>
        <Box sx={{ display: "grid", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="rounded" width={30} height={20} sx={{ borderRadius: 999 }} />
            <Skeleton variant="rounded" width={56 + ((index * 17) % 30)} height={13} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="rounded" width={64} height={4} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" width={72} height={11} />
          </Box>
        </Box>
      </Cell>
      <Cell>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: "3px",
            height: 22,
          }}
        >
          {bars.map((h, i) => (
            <Skeleton key={i} variant="rounded" width={6} height={h} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" width={14} height={13} />
      </Cell>
      <Cell>
        <Skeleton variant="rounded" width={52 + ((index * 19) % 40)} height={13} />
      </Cell>
      <Cell>
        <Skeleton variant="rounded" width={84} height={13} />
      </Cell>
      <Cell justify="flex-end">
        <Skeleton variant="circular" width={32} height={32} />
      </Cell>
    </Box>
  );
}

/** Loading state for Team Members, laid out exactly like the page so nothing jumps when data lands. */
export function TeamMembersSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <AdminTabsSkeleton active={0} />

      {/* Page header: title, two-line description, hero "Add User" button */}
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
          <Skeleton variant="rounded" width={196} height={28} />
          <Skeleton variant="rounded" width={600} height={14} sx={{ maxWidth: "80vw", mt: 0.5 }} />
          <Skeleton variant="rounded" width={260} height={14} />
        </Box>
        <Skeleton variant="rounded" width={132} height={40} sx={{ borderRadius: 999, flexShrink: 0 }} />
      </Box>

      <Box sx={{ display: "grid", gap: 6 }}>
        {/* Team stats: total with role legend, active with ring, disabled with a note, signed-in with a bar */}
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
          <StatCardSkeleton footer="legend" legend={[52, 68, 48]} />
          <StatCardSkeleton footer="ring" />
          <StatCardSkeleton footer="line" />
          <StatCardSkeleton footer="bar" />
        </Box>

        <UsersTableSkeleton rows={rows} />
      </Box>
    </PageContainer>
  );
}

/** The table alone: search + three filter selects, column tools, header row, rows. Also used by UsersTable before the grid mounts. */
export function UsersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          px: 3,
          py: 2,
          minHeight: 52,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Skeleton variant="rounded" width={256} height={36} />
        <Skeleton variant="rounded" width={150} height={36} />
        <Skeleton variant="rounded" width={130} height={36} />
        <Skeleton variant="rounded" width={150} height={36} />
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="rounded" width={32} height={32} />
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          alignItems: "center",
          height: 56,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {HEADER_WIDTHS.map((w, i) => (
          <Box key={i} sx={{ px: CELL_PX }}>
            {w > 0 && <Skeleton variant="rounded" width={w} height={10} />}
          </Box>
        ))}
      </Box>
      {Array.from({ length: rows }).map((_, i) => (
        <UserRowSkeleton key={i} index={i} last={i === rows - 1} />
      ))}
    </Card>
  );
}
