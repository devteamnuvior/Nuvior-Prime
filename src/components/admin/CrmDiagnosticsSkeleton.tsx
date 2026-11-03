import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabsSkeleton, GridCell, GridHeaderSkeleton, GridRow, KpiCardSkeleton, PageHeaderSkeleton, vary } from "./AdminPageSkeletons";

/** Same track as the ConflictsTable columns: CRM account, CRM rep, App assignment, Place. */
const COLUMNS = "minmax(180px, 1fr) minmax(160px, 1fr) minmax(220px, 1.4fr) 160px";
const HEADER_WIDTHS = [82, 56, 100, 38];

/** One provider fact: a mono eyebrow label over a short value, two of them carrying a status chip. */
function FactSkeleton({ label, value, chip }: { label: number; value: number; chip?: number }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Skeleton variant="rounded" width={label} height={11} sx={{ my: "2.5px" }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
        {value > 0 && <Skeleton variant="rounded" width={value} height={13} />}
        {chip && <Skeleton variant="rounded" width={chip} height={20} sx={{ borderRadius: 999 }} />}
      </Box>
    </Box>
  );
}

function ConflictRowSkeleton({ index, last }: { index: number; last: boolean }) {
  return (
    <GridRow columns={COLUMNS} height={52} index={index} last={last}>
      <GridCell>
        <Skeleton variant="rounded" width={vary(120, index, 29, 50)} height={12} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(110, index, 23, 60)} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(180, index, 37, 90)} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={index % 3 === 2 ? 10 : 108} height={12} />
      </GridCell>
    </GridRow>
  );
}

/** The conflicts table alone: a search-only toolbar, header and rows. Also shown by ConflictsTable before the grid mounts. */
export function ConflictsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
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
      </Box>
      <GridHeaderSkeleton columns={COLUMNS} widths={HEADER_WIDTHS} />
      {Array.from({ length: rows }).map((_, i) => (
        <ConflictRowSkeleton key={i} index={i} last={i === rows - 1} />
      ))}
    </Card>
  );
}

/** Loading state for CRM Diagnostics, laid out exactly like the page so nothing jumps when data lands. */
export function CrmDiagnosticsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <AdminTabsSkeleton active={1} />
      <PageHeaderSkeleton title={196} lines={[600, 90]} />

      <Box sx={{ display: "grid", gap: 6 }}>
        {/* KPI tiles: mirror accounts, staged rows, last import (long value), conflicts with a hint */}
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
          <KpiCardSkeleton label={112} value={40} />
          <KpiCardSkeleton label={128} value={48} />
          <KpiCardSkeleton label={84} value={196} />
          <KpiCardSkeleton label={136} value={28} hint={150} />
        </Box>

        {/* Provider card: header with title and subheader, then a two-column definition list */}
        <Card>
          <Box sx={{ px: 5, pt: 4, display: "grid", gap: "2px" }}>
            <Skeleton variant="rounded" width={60} height={14} sx={{ my: "3px" }} />
            <Skeleton variant="rounded" width={440} height={13} sx={{ my: "3.5px", maxWidth: "80vw" }} />
          </Box>
          <Box
            sx={{
              p: 5,
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <FactSkeleton label={96} value={36} />
            <FactSkeleton label={122} value={36} chip={72} />
            <FactSkeleton label={104} value={0} chip={64} />
            <FactSkeleton label={110} value={36} />
          </Box>
        </Card>

        {/* Ownership conflicts: heading, then a search-only toolbar and the conflicts grid */}
        <Box>
          <Skeleton variant="rounded" width={150} height={16} sx={{ my: "4px", mb: 3 }} />
          <ConflictsTableSkeleton rows={rows} />
        </Box>

        {/* Ops hint line */}
        <Skeleton variant="rounded" width={480} height={12} sx={{ my: "2.5px", maxWidth: "80vw" }} />
      </Box>
    </PageContainer>
  );
}
