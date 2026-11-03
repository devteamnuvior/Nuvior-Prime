import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabsSkeleton, GridCell, GridHeaderSkeleton, GridRow, PageHeaderSkeleton, vary } from "./AdminPageSkeletons";

/** Same track as the AuditTable columns: Time, Actor, Role, Action, Resource, Before, After. */
const COLUMNS = "200px minmax(180px, 1fr) 110px 190px 200px minmax(180px, 1fr) minmax(180px, 1fr)";
const HEADER_WIDTHS = [28, 36, 30, 44, 56, 44, 36];
/** The audit grid is compact: 39px header, 36px rows. */
const HEADER_H = 39;
const ROW_H = 36;

function AuditRowSkeleton({ index, last }: { index: number; last: boolean }) {
  const hasState = index % 3 !== 2;
  return (
    <GridRow columns={COLUMNS} height={ROW_H} index={index} last={last}>
      <GridCell>
        <Skeleton variant="rounded" width={134} height={12} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(112, index, 29, 48)} height={13} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={index % 4 === 1 ? 62 : 50} height={20} sx={{ borderRadius: 1 }} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(68, index, 23, 44)} height={20} sx={{ borderRadius: 999 }} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={vary(96, index, 31, 60)} height={12} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={hasState && index % 2 === 1 ? vary(120, index, 17, 50) : 10} height={12} />
      </GridCell>
      <GridCell>
        <Skeleton variant="rounded" width={hasState ? vary(130, index, 19, 46) : 10} height={12} />
      </GridCell>
    </GridRow>
  );
}

/** Loading state for the Audit Log, laid out exactly like the page so nothing jumps when data lands. */
export function AuditLogSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <PageContainer aria-busy="true" aria-live="polite">
      <AdminTabsSkeleton active={2} />
      <PageHeaderSkeleton title={118} lines={[560]} />

      <AuditTableSkeleton rows={rows} />
    </PageContainer>
  );
}

/** The table alone: search, two filter fields and the Filter button; column tools on the right; compact rows. Also shown by AuditTable before the grid mounts. */
export function AuditTableSkeleton({ rows = 10 }: { rows?: number }) {
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
        <Skeleton variant="rounded" width={180} height={36} />
        <Skeleton variant="rounded" width={180} height={36} />
        <Skeleton variant="rounded" width={68} height={36} />
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="rounded" width={32} height={32} />
        </Box>
      </Box>
      <GridHeaderSkeleton columns={COLUMNS} widths={HEADER_WIDTHS} height={HEADER_H} />
      {Array.from({ length: rows }).map((_, i) => (
        <AuditRowSkeleton key={i} index={i} last={i === rows - 1} />
      ))}
    </Card>
  );
}
