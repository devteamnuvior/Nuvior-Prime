import { auth, signOut } from "@/auth";
import { hasPermission } from "@/domain/auth/permissions";
import { DashboardShell } from "./DashboardShell";
import { PRIMARY_NAV, SECONDARY_NAV, type NavGroup, type NavItem } from "./nav";
import type { ShellUser } from "./shell-context";

/** Server shell: resolves the session, filters navigation by permission and renders the dashboard chrome. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;

  const visible = (items: NavItem[]): NavItem[] =>
    items
      .filter((i) => !i.permission || (role && hasPermission(role, i.permission)))
      .map((i) => (i.children ? { ...i, children: visible(i.children) } : i));

  const groups: NavGroup[] = [{ items: visible(PRIMARY_NAV) }];
  const secondary = visible(SECONDARY_NAV);
  if (secondary.length) groups.push({ label: "Management", items: secondary });

  const today = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  const shellUser: ShellUser | null = user?.id
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleLabel: roleLabel(user.role),
        territory: user.provinces.includes("*") ? "All provinces" : user.provinces.join(" · "),
        initials: initialsOf(user.name, user.email),
      }
    : null;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <DashboardShell groups={groups} user={shellUser} signOutAction={signOutAction} today={today}>
      {children}
    </DashboardShell>
  );
}

export function roleLabel(role: string): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "MANAGER") return "Manager";
  return "Representative";
}

function initialsOf(name: string, email: string): string {
  const parts = name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}
