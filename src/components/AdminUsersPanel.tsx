"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { adminUpdateUserAction } from "@/app/actions";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow, UserActionResult } from "@/domain/auth/userAdmin";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { toast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddUserButton } from "./admin/AddUserButton";
import { CreateUserDrawer } from "./admin/CreateUserDrawer";
import { TeamStats } from "./admin/TeamStats";
import { UsersTable } from "./admin/UsersTable";
import { PROVINCE_OPTIONS, ROLE_META, ROLE_ORDER } from "./admin/userPresentation";

type RoleFilter = "ALL" | AppRoleName;
type StatusFilter = "ALL" | "ACTIVE" | "DISABLED";

/** Filter selects read like the search placeholder until a value is chosen. */
const filterSx = (isDefault: boolean) => ({ fontSize: "0.8125rem", color: isDefault ? "text.disabled" : "text.primary" });

export function AdminUsersPanel({
  users,
  currentUserId,
  renderedAt,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  /** Server timestamp used for relative times, so SSR and hydration agree. */
  renderedAt: number;
}) {
  // Start from the server clock (hydration-safe), then tick once a minute.
  const [now, setNow] = React.useState(renderedAt);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [provinceFilter, setProvinceFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = React.useState<AdminUserRow | null>(null);
  const [, start] = React.useTransition();

  const filtered = React.useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
        if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
        if (provinceFilter && !u.provinces.includes("*") && !u.provinces.includes(provinceFilter)) return false;
        return true;
      }),
    [users, roleFilter, statusFilter, provinceFilter],
  );

  const hasFilters = roleFilter !== "ALL" || statusFilter !== "ALL" || provinceFilter !== "";
  const clearFilters = React.useCallback(() => {
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setProvinceFilter("");
  }, []);

  const stats = React.useMemo(() => {
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      total: users.length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      disabled: users.filter((u) => u.status === "DISABLED").length,
      recent: users.filter((u) => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= thirtyDaysAgo).length,
      byRole: ROLE_ORDER.map((r) => ({ role: r, count: users.filter((u) => u.role === r).length })),
    };
  }, [users, now]);

  const runUpdate = React.useCallback(
    (user: AdminUserRow, data: { role?: AppRoleName; status?: "ACTIVE" | "DISABLED" }) => {
      setBusyUserId(user.id);
      start(async () => {
        const r = await adminUpdateUserAction({ userId: user.id, ...data });
        toast.result(r);
        setBusyUserId(null);
      });
    },
    [],
  );

  const onChangeRole = React.useCallback((u: AdminUserRow, role: AppRoleName) => runUpdate(u, { role }), [runUpdate]);
  const onToggleStatus = React.useCallback(
    (u: AdminUserRow) => {
      if (u.status === "ACTIVE") setConfirmDisable(u);
      else runUpdate(u, { status: "ACTIVE" });
    },
    [runUpdate],
  );

  const onCreated = React.useCallback((r: UserActionResult) => toast.result(r), []);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const filters = (
    <>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} inputProps={{ "aria-label": "Filter by role" }} sx={filterSx(roleFilter === "ALL")}>
          <MenuItem value="ALL">All Roles</MenuItem>
          {ROLE_ORDER.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_META[r].short}
              <Box component="span" sx={{ ml: "auto", pl: 3, fontFamily: "var(--mono)", fontSize: "0.6875rem", color: "text.disabled" }}>
                {stats.byRole.find((b) => b.role === r)?.count ?? 0}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} inputProps={{ "aria-label": "Filter by status" }} sx={filterSx(statusFilter === "ALL")}>
          <MenuItem value="ALL">Any Status</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="DISABLED">Disabled</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} displayEmpty inputProps={{ "aria-label": "Filter by province" }} sx={filterSx(provinceFilter === "")}>
          <MenuItem value="">Any Province</MenuItem>
          {PROVINCE_OPTIONS.map((p) => (
            <MenuItem key={p.code} value={p.code}>
              {p.code} · {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {hasFilters && (
        <Button size="small" variant="text" onClick={clearFilters}>
          Clear
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="Team Members"
        description="Manage who can sign in, what they can do and where they operate. Every change is written to the audit log."
        actions={<AddUserButton onClick={() => setDrawerOpen(true)} />}
      />
      <Box sx={{ display: "grid", gap: 6 }}>
        <TeamStats total={stats.total} active={stats.active} disabled={stats.disabled} recent={stats.recent} byRole={stats.byRole} />

        <UsersTable
          users={filtered}
          currentUserId={currentUserId}
          now={now}
          busyUserId={busyUserId}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          onChangeRole={onChangeRole}
          onToggleStatus={onToggleStatus}
          filters={filters}
        />

        <CreateUserDrawer open={drawerOpen} onClose={closeDrawer} onCreated={onCreated} />

        <ConfirmDialog
          open={!!confirmDisable}
          onClose={() => setConfirmDisable(null)}
          title={`Disable ${confirmDisable?.displayName ?? "this user"}?`}
          description="They will be signed out and unable to sign in until the account is enabled again. This is recorded in the audit log."
          confirmLabel="Disable account"
          destructive
          onConfirm={() => {
            if (confirmDisable) runUpdate(confirmDisable, { status: "DISABLED" });
            setConfirmDisable(null);
          }}
        />
      </Box>
    </>
  );
}
