import Link from "next/link";
import { auth, signOut } from "@/auth";
import { hasPermission, type Permission } from "@/domain/auth/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  permission?: Permission;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: "route" },
  { href: "/accounts", label: "Prospecting", icon: "search" },
  { href: "/visits", label: "Visit History", icon: "history", permission: "visit.view.own" },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/team", label: "Team", icon: "team", permission: "visit.view.team" },
  { href: "/verification", label: "Verification", icon: "check", permission: "verification.review" },
  { href: "/matching", label: "Matching", icon: "link", permission: "mapping.review" },
  { href: "/admin/users", label: "Admin", icon: "shield", permission: "user.manage" },
];

export async function AppShell({
  children,
  title,
  fullBleed = false,
}: {
  children: React.ReactNode;
  title?: string;
  fullBleed?: boolean;
}) {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;

  const visible = (items: NavItem[]) =>
    items.filter((i) => !i.permission || (role && hasPermission(role, i.permission)));

  const today = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const territory = !user
    ? null
    : user.provinces.includes("*")
      ? "All provinces"
      : user.provinces.join(" · ");

  return (
    <div className="min-h-screen">
      {/* ---- Desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-rule bg-panel md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-inkwell text-[15px] text-paper"
            style={{ fontFamily: "var(--brand-serif)", fontStyle: "italic" }}
          >
            N
          </span>
          <span className="text-[13px] font-semibold tracking-[0.16em] text-ink uppercase">
            Nuvior <span className="text-accent">Prime</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <NavGroup items={visible(PRIMARY_NAV)} />
          {visible(SECONDARY_NAV).length > 0 && (
            <>
              <div className="mt-5 mb-1.5 px-2.5 text-[0.62rem] font-semibold tracking-[0.18em] text-faint uppercase">
                Management
              </div>
              <NavGroup items={visible(SECONDARY_NAV)} />
            </>
          )}
        </nav>

        {user?.id ? (
          <div className="border-t border-rule-soft px-5 py-4">
            <div className="text-[13px] font-semibold text-ink">{user.name}</div>
            <div className="mt-0.5 text-xs text-muted">
              {roleLabel(user.role)} · {territory}
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </aside>

      {/* ---- Content column ---- */}
      <div className="flex min-h-screen flex-col md:pl-56">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-rule bg-paper">
          <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-baseline gap-3">
              <Link href="/" className="flex items-center gap-2 md:hidden">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-inkwell text-[13px] text-paper"
                  style={{ fontFamily: "var(--brand-serif)", fontStyle: "italic" }}
                >
                  N
                </span>
              </Link>
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                {title ?? "NUVIOR Prime"}
              </h1>
              <span className="hidden truncate text-[13px] text-muted sm:inline">{today}</span>
            </div>
            {territory && (
              <span className="shrink-0 rounded-full border border-rule bg-panel px-3 py-1 text-xs font-medium text-muted">
                {territory}
              </span>
            )}
          </div>
          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-t border-rule-soft px-2 py-1.5 md:hidden">
            {[...visible(PRIMARY_NAV), ...visible(SECONDARY_NAV)].map((i) => (
              <Link
                key={i.label}
                href={i.href}
                className="rounded-md px-3 py-2 text-[13px] font-medium whitespace-nowrap text-muted hover:bg-canvas hover:text-ink"
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className={fullBleed ? "flex min-h-0 flex-1 flex-col" : "mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.label}>
          <Link
            href={i.href}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <span className="text-faint">{ICONS[i.icon]}</span>
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function roleLabel(role: string): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "MANAGER") return "Manager";
  return "Representative";
}

const iconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS = {
  route: (
    <svg {...iconProps}>
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M9 19h6.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H15" />
    </svg>
  ),
  search: (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
  history: (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  building: (
    <svg {...iconProps}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2" />
    </svg>
  ),
  team: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.8 14.5a6.5 6.5 0 0 1 3.7 5.5" />
    </svg>
  ),
  check: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  ),
  link: (
    <svg {...iconProps}>
      <path d="M10 14a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 5.93" />
      <path d="M14 10a5 5 0 0 0-7.07 0L4.8 12.12a5 5 0 0 0 7.07 7.07L13 18.07" />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
    </svg>
  ),
};
