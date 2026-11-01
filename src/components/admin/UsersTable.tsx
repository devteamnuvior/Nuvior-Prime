"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow } from "@/domain/auth/userAdmin";
import { actionsColumn, DataTable, GridActionsCellItem, type GridColDef } from "@/components/data-table/DataTable";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { TerritoryBadges } from "./ProvinceBadge";
import { UserAvatar } from "./UserAvatar";
import { ROLE_META, ROLE_ORDER, formatDate, formatRelative } from "./userPresentation";

const ROLE_PILL_WIDTH = 124;
const ROLE_PILL_HEIGHT = 28;

/** Per-role colour: solid teal for admins, blue for managers, green for reps. */
const ROLE_PILL: Record<AppRoleName, { bg: string; fg: string }> = {
  ADMIN: { bg: "primary.main", fg: "primary.contrastText" },
  MANAGER: { bg: "rgba(var(--nv-palette-info-mainChannel) / 0.12)", fg: "info.main" },
  REP: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main" },
};

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
  const router = useRouter();
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
                <Typography
                  component={Link}
                  href={`/admin/users/${row.id}`}
                  variant="body2"
                  noWrap
                  sx={{ fontWeight: 600, color: "text.primary", textDecoration: "none", "&:hover": { color: "primary.main", textDecoration: "underline" } }}
                >
                  {row.displayName}
                </Typography>
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
      actionsColumn<AdminUserRow>(({ row }) => {
        const isSelf = row.id === currentUserId;
        const busy = busyUserId === row.id;
        const roleItems = ROLE_ORDER.filter((r) => r !== row.role).map((r) => (
          <GridActionsCellItem
            key={r}
            showInMenu
            icon={<ManageAccountsOutlined fontSize="small" />}
            label={`Make ${ROLE_META[r].short}`}
            disabled={isSelf || busy}
            onClick={() => onChangeRole(row, r)}
          />
        ));
        return [
          <GridActionsCellItem
            key="profile"
            showInMenu
            icon={<InsightsOutlined fontSize="small" />}
            label="View performance"
            onClick={() => router.push(`/admin/users/${row.id}`)}
          />,
          ...roleItems,
          <GridActionsCellItem
            key="status"
            showInMenu
            icon={row.status === "ACTIVE" ? <BlockOutlined fontSize="small" /> : <CheckCircleOutlineOutlined fontSize="small" />}
            label={row.status === "ACTIVE" ? "Disable account" : "Enable account"}
            disabled={isSelf || busy}
            onClick={() => onToggleStatus(row)}
            style={row.status === "ACTIVE" ? { color: "var(--nv-palette-error-main)" } : undefined}
          />,
        ];
      }),
    ],
    [currentUserId, busyUserId, now, onChangeRole, onToggleStatus, router],
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
