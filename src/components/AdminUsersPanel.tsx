"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { adminUpdateUserAction } from "@/app/actions";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow, UserActionResult } from "@/domain/auth/userAdmin";
import { CreateUserDrawer } from "./admin/CreateUserDrawer";
import { UsersTable } from "./admin/UsersTable";
import { PROVINCE_OPTIONS, ROLE_META, ROLE_ORDER } from "./admin/userPresentation";

type RoleFilter = "ALL" | AppRoleName;
type StatusFilter = "ALL" | "ACTIVE" | "DISABLED";

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
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.displayName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      if (provinceFilter && !u.provinces.includes("*") && !u.provinces.includes(provinceFilter)) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter, provinceFilter]);

  const hasFilters = query !== "" || roleFilter !== "ALL" || statusFilter !== "ALL" || provinceFilter !== "";
  const clearFilters = useCallback(() => {
    setQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setProvinceFilter("");
  }, []);

  const stats = useMemo(() => {
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      total: users.length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      disabled: users.filter((u) => u.status === "DISABLED").length,
      recent: users.filter((u) => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= thirtyDaysAgo).length,
      byRole: ROLE_ORDER.map((r) => ({ role: r, count: users.filter((u) => u.role === r).length })),
    };
  }, [users, now]);

  function runUpdate(user: AdminUserRow, data: { role?: AppRoleName; status?: "ACTIVE" | "DISABLED" }) {
    setBusyUserId(user.id);
    start(async () => {
      const r = await adminUpdateUserAction({ userId: user.id, ...data });
      setToast({ ok: r.ok, message: r.message });
      setBusyUserId(null);
    });
  }

  const onCreated = useCallback((r: UserActionResult) => setToast({ ok: r.ok, message: r.message }), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total users" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="accent" />
        <StatTile label="Disabled" value={stats.disabled} tone={stats.disabled ? "muted" : undefined} />
        <StatTile label="Signed in · 30 days" value={stats.recent} hint={`of ${stats.active} active`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <svg
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search users"
              className="h-9 w-full rounded-md border border-rule bg-panel pr-3 pl-8 text-sm text-ink placeholder:text-faint transition-colors hover:border-faint focus:border-accent focus:outline-none"
            />
          </div>

          <div role="group" aria-label="Filter by role" className="flex rounded-md border border-rule bg-panel p-0.5">
            {(["ALL", ...ROLE_ORDER] as RoleFilter[]).map((r) => {
              const on = roleFilter === r;
              const count = r === "ALL" ? stats.total : stats.byRole.find((b) => b.role === r)?.count ?? 0;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRoleFilter(r)}
                  className={`flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                    on ? "bg-inkwell text-paper shadow-card" : "text-muted hover:text-ink"
                  }`}
                >
                  {r === "ALL" ? "All" : ROLE_META[r].short}
                  <span className={`font-mono text-[0.62rem] ${on ? "text-paper/70" : "text-faint"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="h-9 rounded-md border border-rule bg-panel px-2.5 text-xs text-ink transition-colors hover:border-faint focus:border-accent focus:outline-none"
          >
            <option value="ALL">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>

          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            aria-label="Filter by province"
            className="h-9 rounded-md border border-rule bg-panel px-2.5 text-xs text-ink transition-colors hover:border-faint focus:border-accent focus:outline-none"
          >
            <option value="">Any province</option>
            {PROVINCE_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-2 text-xs font-medium text-accent hover:text-accent-hover"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="font-mono text-[0.65rem] tracking-wider text-faint uppercase">
            {filtered.length === users.length ? `${users.length} users` : `${filtered.length} of ${users.length}`}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-inkwell px-3.5 text-sm font-medium text-paper shadow-card transition-colors hover:bg-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add user
          </button>
        </div>
      </div>

      <UsersTable
        users={filtered}
        currentUserId={currentUserId}
        now={now}
        busyUserId={busyUserId}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onChangeRole={(u, role) => runUpdate(u, { role })}
        onToggleStatus={(u) => runUpdate(u, { status: u.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
      />

      <CreateUserDrawer open={drawerOpen} onClose={closeDrawer} onCreated={onCreated} />

      {toast && (
        <div
          role="status"
          className={`nv-fade-up fixed right-4 bottom-4 z-[60] flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm shadow-float ${
            toast.ok ? "border-accent/30 bg-panel text-ink" : "border-danger/30 bg-danger-tint text-danger"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${toast.ok ? "bg-accent" : "bg-danger"}`} aria-hidden />
          {toast.message}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "accent" | "muted";
}) {
  return (
    <div className="rounded-xl border border-rule bg-panel px-4 py-3.5 shadow-card">
      <div className="font-mono text-[0.62rem] tracking-[0.14em] text-faint uppercase">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-semibold tracking-tight ${
            tone === "accent" ? "text-accent" : tone === "muted" ? "text-muted" : "text-ink"
          }`}
          style={{ fontFamily: "var(--display)" }}
        >
          {value}
        </span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
    </div>
  );
}
