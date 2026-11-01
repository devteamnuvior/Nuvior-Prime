"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import { LAYOUT } from "@/theme/tokens";
import { BrandMark } from "./BrandMark";
import { CommandSearch } from "./CommandSearch";
import { UserMenu } from "./UserMenu";
import { breadcrumbsFor, type NavGroup } from "./nav";
import { useShell } from "./shell-context";

export function Header({
  groups,
  signOutAction,
  today,
}: {
  groups: NavGroup[];
  signOutAction: () => Promise<void>;
  today: string;
}) {
  const pathname = usePathname();
  const { setMobileOpen, user } = useShell();
  const crumbs = breadcrumbsFor(pathname);
  const all = pathname === "/" ? crumbs : [{ href: "/", label: "Home" }, ...crumbs];

  return (
    <AppBar sx={{ zIndex: (t) => t.zIndex.drawer - 1 }}>
      <Toolbar disableGutters sx={{ minHeight: LAYOUT.headerHeight, height: LAYOUT.headerHeight, px: { xs: 4, md: 6 }, gap: 3 }}>
        <IconButton size="small" onClick={() => setMobileOpen(true)} aria-label="Open navigation" sx={{ display: { md: "none" } }}>
          <MenuOutlined fontSize="small" />
        </IconButton>
        <Box component={Link} href="/" aria-label="NUVIOR Prime home" sx={{ display: { xs: "flex", md: "none" } }}>
          <BrandMark size={24} />
        </Box>

        <Breadcrumbs
          aria-label="breadcrumb"
          maxItems={4}
          sx={{
            minWidth: 0,
            flex: 1,
            "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
            "& .MuiBreadcrumbs-li": { minWidth: 0 },
            // Phones: only the current page; the drawer carries the hierarchy.
            "& .MuiBreadcrumbs-li:not(:last-of-type), & .MuiBreadcrumbs-separator": { display: { xs: "none", sm: "flex" } },
          }}
        >
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return last ? (
              <Typography key={c.href} variant="body2" noWrap sx={{ fontWeight: 600, color: "text.primary" }} aria-current="page">
                {c.label}
              </Typography>
            ) : (
              <MuiLink key={c.href} component={Link} href={c.href} color="text.secondary" variant="body2">
                {c.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>

        <Typography variant="body2" sx={{ color: "text.secondary", display: { xs: "none", xl: "block" } }}>
          {today}
        </Typography>
        {user && <Chip label={user.territory} size="small" variant="outlined" sx={{ display: { xs: "none", lg: "inline-flex" }, borderRadius: 999 }} />}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CommandSearch groups={groups} />
          {user && <UserMenu user={user} signOutAction={signOutAction} />}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
