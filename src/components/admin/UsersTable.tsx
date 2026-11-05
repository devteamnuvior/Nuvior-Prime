"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow } from "@/domain/auth/userAdmin";
import { DataTable, type GridColDef } from "@/components/data-table/DataTable";
import { levelFor } from "@/domain/performance/xp";
import { EASE } from "@/theme/tokens";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { TerritoryBadges } from "./ProvinceBadge";
import { UserAvatar } from "./UserAvatar";
import { UserRowMenu } from "./UserRowMenu";
import { ROLE_META, ROLE_ORDER, formatDate, formatRelative } from "./userPresentation";
import { UsersTableSkeleton } from "./TeamMembersSkeleton";

const ROLE_PILL_WIDTH = 124;
const ROLE_PILL_HEIGHT = 28;

/** Per-role colour: solid teal for admins, green for reps. */
const ROLE_PILL: Record<AppRoleName, { bg: string; fg: string }> = {
  ADMIN: { bg: "primary.main", fg: "primary.contrastText" },
  REP: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main" },
};

const REDUCED = "@media (prefers-reduced-motion: reduce)";
const nf = new Intl.NumberFormat("en-CA");

/**
 * Name link with a text roll on hover: the label slides up out of view while a tinted copy
 * slides in from below. No underline. The copy is hidden from assistive tech.
 */
function RollingName({ href, children }: { href: string; children: string }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "inline-block",
        overflow: "hidden",
        maxWidth: 1,
        height: "1.35em",
        lineHeight: 1.35,
        verticalAlign: "top",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "text.primary",
        textDecoration: "none",
        borderRadius: 0.5,
        "& .nv-roll": { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: `transform 380ms ${EASE}` },
        "& .nv-roll--copy": { color: "primary.main" },
        "&:hover .nv-roll, &:focus-visible .nv-roll": { transform: "translateY(-100%)" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
        [REDUCED]: { "& .nv-roll": { transition: "none" }, "&:hover .nv-roll, &:focus-visible .nv-roll": { transform: "none" }, "&:hover": { color: "primary.main" } },
      }}
    >
      <Box component="span" className="nv-roll">
        {children}
      </Box>
      <Box component="span" className="nv-roll nv-roll--copy" aria-hidden>
        {children}
      </Box>
    </Box>
  );
}

/** Level pill, lifetime XP and a sliver of progress to the next level. */
function LevelCell({ xp }: { xp: number }) {
  const level = levelFor(xp);
  const ratio = level.next == null ? 1 : Math.max(0, Math.min(1, (xp - level.min) / Math.max(1, level.next - level.min)));
  return (
    <Box sx={{ display: "grid", gap: 1, minWidth: 0, py: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", height: 20, px: 1.5, borderRadius: 999, bgcolor: "primary.tint", color: "primary.main", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0 }}>
          L{level.index + 1}
        </Box>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {level.name}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box aria-hidden sx={{ width: 64, height: 4, borderRadius: 2, bgcolor: "grey.200", overflow: "hidden", flexShrink: 0 }}>
          <Box sx={{ height: 1, width: `${ratio * 100}%`, borderRadius: 2, bgcolor: "primary.main" }} />
        </Box>
        <Typography variant="caption" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {nf.format(xp)} XP{level.toNext != null ? ` · ${nf.format(level.toNext)} to go` : ""}
        </Typography>
      </Box>
    </Box>
  );
}

/** Six tiny bars for the last 30 days of logged visits, newest on the right, with the total beside. */
function ActivityCell({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...buckets);
  return (
    <Tooltip title={total ? `${total} visit${total === 1 ? "" : "s"} logged in the last 30 days` : "No visits logged in the last 30 days"}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }} role="img" aria-label={`${total} visits in the last 30 days`}>
        <Box aria-hidden sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 22 }}>
          {buckets.map((b, i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: Math.max(3, Math.round((b / max) * 22)),
                borderRadius: 1,
                bgcolor: b === 0 ? "grey.200" : i === buckets.length - 1 ? "primary.main" : "primary.light",
                transformOrigin: "bottom",
                transition: `height 500ms ${EASE}`,
              }}
            />
          ))}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: total ? 600 : 400, color: total ? "text.primary" : "text.disabled", fontVariantNumeric: "tabular-nums" }}>
          {total}
        </Typography>
      </Box>
    </Tooltip>
  );
}

/** Display-only role pill; every role shares the same geometry so the column lines up. */
function RolePill({ role }: { role: AppRoleName }) {
  const pill = ROLE_PILL[role];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: ROLE_PILL_WIDTH,
        height: ROLE_PILL_HEIGHT,
        borderRadius: 999,
        bgcolor: pill.bg,
        color: pill.fg,
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_META[role].label}
    </Box>
  );
}

export function UsersTable({
  users,
  currentUserId,
  now,
  busyUserId,
  onChangeRole,
  onToggleStatus,
  onClearFilters,
  hasFilters,
  filters,
  actions,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  now: number;
  busyUserId: string | null;
  onChangeRole: (user: AdminUserRow, role: AppRoleName) => void;
  onToggleStatus: (user: AdminUserRow) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const columns = React.useMemo<GridColDef<AdminUserRow>[]>(
    () => [
      {
        field: "displayName",
        headerName: "User",
        flex: 1.4,
        minWidth: 240,
        valueGetter: (_v, row) => `${row.displayName} ${row.email}`,
        sortComparator: (a, b) => String(a).localeCompare(String(b)),
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, py: 1 }}>
            <UserAvatar name={row.displayName} email={row.email} status={row.status} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <RollingName href={`/admin/users/${row.id}`}>{row.displayName}</RollingName>
                {row.id === currentUserId && <CodeChip label="You" />}
              </Box>
              <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "role",
        headerName: "Role",
        width: 150,
        type: "singleSelect",
        valueOptions: ROLE_ORDER.map((r) => ({ value: r, label: ROLE_META[r].label })),
        sortComparator: (a, b) => ROLE_ORDER.indexOf(a as AppRoleName) - ROLE_ORDER.indexOf(b as AppRoleName),
        renderCell: ({ value }) => <RolePill role={value as AppRoleName} />,
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        type: "singleSelect",
        valueOptions: [
          { value: "ACTIVE", label: "Active" },
          { value: "DISABLED", label: "Disabled" },
        ],
        renderCell: ({ value }) => <StatusChip tone={value === "ACTIVE" ? "success" : "neutral"} label={value === "ACTIVE" ? "Active" : "Disabled"} />,
      },
      {
        field: "provinces",
        headerName: "Territory",
        flex: 1,
        minWidth: 160,
        sortable: false,
        valueGetter: (_v, row) => (row.provinces.includes("*") ? "All provinces" : row.provinces.join(", ")),
        renderCell: ({ row }) => <TerritoryBadges codes={row.provinces} />,
      },
      {
        field: "xpTotal",
        headerName: "Level",
        width: 190,
        type: "number",
        align: "left",
        headerAlign: "left",
        valueGetter: (v) => (v as number | undefined) ?? 0,
        renderCell: ({ row }) => <LevelCell xp={row.xpTotal ?? 0} />,
      },
      {
        field: "activity",
        headerName: "Visits · 30d",
        width: 130,
        sortable: true,
        valueGetter: (v) => ((v as number[] | undefined) ?? []).reduce((a, b) => a + b, 0),
        renderCell: ({ row }) => <ActivityCell buckets={row.activity ?? [0, 0, 0, 0, 0, 0]} />,
      },
      {
        field: "lastLoginAt",
        headerName: "Last Active",
        width: 140,
        valueGetter: (v) => (v ? new Date(v as string).getTime() : 0),
        renderCell: ({ row }) => (
          <Tooltip title={row.lastLoginAt ?? "Never signed in"}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {formatRelative(row.lastLoginAt, now)}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: "createdAt",
        headerName: "Added",
        width: 130,
        valueGetter: (v) => new Date(v as string).getTime(),
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {formatDate(row.createdAt)}
          </Typography>
        ),
      },
      {
        field: "__actions",
        headerName: "",
        width: 56,
        align: "right",
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => <UserRowMenu user={row} isSelf={row.id === currentUserId} busy={busyUserId === row.id} onChangeRole={onChangeRole} onToggleStatus={onToggleStatus} />,
      },
    ],
    [currentUserId, busyUserId, now, onChangeRole, onToggleStatus],
  );

  return (
    <DataTable<AdminUserRow>
      rows={users}
      columns={columns}
      label="Team Members"
      searchPlaceholder="Search Name or Email"
      filters={filters}
      actions={actions}
      initialSort={[{ field: "displayName", sort: "asc" }]}
      skeleton={<UsersTableSkeleton rows={Math.min(Math.max(users.length, 3), 8)} />}
      emptyState={{
        illustration: "search",
        title: "No users match",
        description: "Try a different search or clear the filters.",
        action: hasFilters ? (
          <Chip label="Clear filters" size="small" onClick={onClearFilters} variant="outlined" />
        ) : undefined,
      }}
      gridProps={{
        hideFooter: true,
        getRowClassName: ({ row }) => (busyUserId === row.id ? "nv-row-busy" : ""),
        sx: { "& .nv-row-busy": { opacity: 0.6 } },
        rowHeight: 60,
      }}
    />
  );
}
