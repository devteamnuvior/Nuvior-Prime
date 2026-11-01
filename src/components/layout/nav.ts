import type { Permission } from "@/domain/auth/permissions";

/** Icon keys resolve to MUI icons in nav-icons.tsx (strings keep server → client props serializable). */
export type NavIconKey =
  | "route"
  | "search"
  | "history"
  | "team"
  | "verify"
  | "link"
  | "shield"
  | "users"
  | "database"
  | "audit";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  permission?: Permission;
  /** "exact" matches only the href; "prefix" (default) also matches nested routes. */
  match?: "exact" | "prefix";
  children?: NavItem[];
};

export type NavGroup = { label?: string; items: NavItem[] };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today's Route", icon: "route", match: "exact" },
  { href: "/accounts", label: "Prospecting", icon: "search" },
  { href: "/visits", label: "Visit History", icon: "history", permission: "visit.view.own" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/team", label: "Team", icon: "team", permission: "visit.view.team" },
  { href: "/verification", label: "Verification", icon: "verify", permission: "verification.review" },
  { href: "/matching", label: "Matching", icon: "link", permission: "mapping.review" },
  {
    href: "/admin/users",
    label: "Admin",
    icon: "shield",
    permission: "user.manage",
    children: [
      { href: "/admin/users", label: "Users", icon: "users", permission: "user.manage" },
      { href: "/admin/crm", label: "CRM Diagnostics", icon: "database", permission: "admin.settings" },
      { href: "/admin/audit", label: "Audit Log", icon: "audit", permission: "audit.view" },
    ],
  },
];

/** Human labels for breadcrumb segments. */
export const ROUTE_LABELS: Record<string, string> = {
  "/": "Today's Route",
  "/accounts": "Prospecting",
  "/visits": "Visit History",
  "/team": "Team",
  "/verification": "Verification",
  "/matching": "Matching",
  "/admin": "Admin",
  "/admin/users": "Users",
  "/admin/crm": "CRM Diagnostics",
  "/admin/audit": "Audit Log",
};

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/" || item.match === "exact") return pathname === item.href;
  if (item.children?.length) {
    const root = item.href.split("/").slice(0, 2).join("/");
    return pathname === root || pathname.startsWith(root + "/");
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export type Crumb = { href: string; label: string };

export function breadcrumbsFor(pathname: string): Crumb[] {
  if (pathname === "/") return [{ href: "/", label: ROUTE_LABELS["/"] }];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    crumbs.push({ href: acc, label: ROUTE_LABELS[acc] ?? seg.replace(/-/g, " ") });
  }
  return crumbs;
}
