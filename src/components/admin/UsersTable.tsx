"use client";

import { useMemo, useState } from "react";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow } from "@/domain/auth/userAdmin";
import { UserAvatar } from "./UserAvatar";
import { ROLE_META, ROLE_ORDER, formatDate, formatRelative, provinceName } from "./userPresentation";

type SortKey = "name" | "role" | "lastLogin" | "created";

export function UsersTable({
  users,
  currentUserId,
  now,
  busyUserId,
  onChangeRole,
  onToggleStatus,
  onClearFilters,
  hasFilters,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  now: number;
  busyUserId: string | null;
  onChangeRole: (user: AdminUserRow, role: AppRoleName) => void;
  onToggleStatus: (user: AdminUserRow) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      switch (sortKey) {
        case "role":
          return (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) * dir;
        case "lastLogin": {
          const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return (tb - ta) * dir;
        }
        case "created":
          return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * dir;
        default:
          return a.displayName.localeCompare(b.displayName) * dir;
      }
    });
  }, [users, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-panel shadow-card">
      <div className="nv-scroll overflow-x-auto [contain:paint]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-canvas/60 font-mono text-[0.62rem] tracking-[0.14em] text-faint uppercase">
              <SortableTh label="User" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} className="pl-5" />
              <SortableTh label="Role" active={sortKey === "role"} dir={sortDir} onClick={() => toggleSort("role")} />
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Territory</th>
              <SortableTh label="Last active" active={sortKey === "lastLogin"} dir={sortDir} onClick={() => toggleSort("lastLogin")} />
              <SortableTh label="Added" active={sortKey === "created"} dir={sortDir} onClick={() => toggleSort("created")} className="hidden xl:table-cell" />
              <th className="px-3 py-3 pr-5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = busyUserId === u.id;
              const role = ROLE_META[u.role];
              return (
                <tr
                  key={u.id}
                  className={`group border-b border-rule-soft transition-colors last:border-b-0 hover:bg-canvas/50 ${
                    busy ? "opacity-60" : ""
                  }`}
                >
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.displayName} email={u.email} status={u.status} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-ink">{u.displayName}</span>
                          {isSelf && (
                            <span className="rounded-full border border-rule px-1.5 py-px font-mono text-[0.58rem] tracking-wider text-muted uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-xs text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${role.pillClass}`}
                    >
                      {role.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={u.status} />
                  </td>
                  <td className="px-3 py-3">
                    <ProvinceChips codes={u.provinces} />
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-muted" title={u.lastLoginAt ?? undefined}>
                    {formatRelative(u.lastLoginAt, now)}
                  </td>
                  <td className="hidden px-3 py-3 text-xs whitespace-nowrap text-muted xl:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="py-3 pr-5 pl-3">
                    <div className="flex items-center justify-end gap-2">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Change role for {u.displayName}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={isSelf || busy}
                        title={isSelf ? "You cannot change your own role" : "Change role"}
                        onChange={(e) => onChangeRole(u, e.target.value as AppRoleName)}
                        className="h-8 rounded-md border border-rule bg-paper px-2 text-xs text-ink transition-colors hover:border-faint disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ROLE_ORDER.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_META[r].short}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isSelf || busy}
                        title={isSelf ? "You cannot disable your own account" : undefined}
                        onClick={() => onToggleStatus(u)}
                        className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          u.status === "ACTIVE"
                            ? "border-rule bg-paper text-muted hover:border-danger/40 hover:bg-danger-tint hover:text-danger"
                            : "border-accent/40 bg-accent-tint text-accent hover:bg-accent hover:text-paper"
                        }`}
                      >
                        {u.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-faint">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-4-4" />
                      </svg>
                    </span>
                    <p className="text-sm font-medium text-ink">No users match</p>
                    <p className="text-xs text-muted">Try a different search or clear the filters.</p>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={onClearFilters}
                        className="mt-1 text-xs font-medium text-accent hover:text-accent-hover"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3 font-medium whitespace-nowrap ${className}`} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all ${active ? "opacity-100" : "opacity-0 group-hover:opacity-40"} ${
            active && dir === "desc" ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    </th>
  );
}

export function StatusPill({ status }: { status: "ACTIVE" | "DISABLED" }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
        active ? "border-accent/25 bg-accent-tint text-accent" : "border-rule bg-canvas text-muted"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-faint"}`} aria-hidden />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

export function ProvinceChips({ codes, max = 3 }: { codes: string[]; max?: number }) {
  if (codes.includes("*")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-inkwell/90 px-2 py-0.5 font-mono text-[0.65rem] tracking-wider text-paper">
        ALL PROVINCES
      </span>
    );
  }
  if (codes.length === 0) {
    return <span className="text-xs text-faint">None</span>;
  }
  const shown = codes.slice(0, max);
  const rest = codes.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((c) => (
        <span
          key={c}
          title={provinceName(c)}
          className="rounded-md border border-rule bg-paper px-1.5 py-0.5 font-mono text-[0.65rem] tracking-wider text-ink"
        >
          {c}
        </span>
      ))}
      {rest > 0 && (
        <span
          title={codes.slice(max).map(provinceName).join(", ")}
          className="rounded-md px-1 py-0.5 font-mono text-[0.65rem] text-muted"
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
