"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { keyframes } from "@emotion/react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import { hasPermission, type AppRoleName } from "@/domain/auth/permissions";
import { LAYOUT } from "@/theme/tokens";
import { BrandMark } from "./BrandMark";
import { CommandSearch } from "./CommandSearch";
import { UserMenu } from "./UserMenu";
import { LiveLocationToggle } from "@/components/today/LiveLocationToggle";
import { breadcrumbsFor, type NavGroup } from "./nav";
import { useShell } from "./shell-context";

const EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";

/* Crumbs slide in from the left, one after another, each time the route changes. */
const crumbIn = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
`;
/* The current page gets an underline that grows from the left once the crumbs have landed. */
const underline = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;
/* Right-hand controls settle in from slightly above on first paint. */
const settle = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const REDUCED = "@media (prefers-reduced-motion: reduce)";

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
  // Admins have no Today's Route; their home is the live map.
  const homeHref = user && !hasPermission(user.role as AppRoleName, "route.plan") ? "/live" : "/";
  const all = pathname === homeHref ? crumbs : [{ href: homeHref, label: "Home" }, ...crumbs];

  return (
    <AppBar sx={{ zIndex: (t) => t.zIndex.drawer - 1 }}>
      {/* The Toolbar mixin raises min-height to 64px from the sm breakpoint; restating it per breakpoint keeps the bar at headerHeight so its bottom border meets the rail's. */}
      <Toolbar disableGutters sx={{ minHeight: { xs: LAYOUT.headerHeight, sm: LAYOUT.headerHeight }, height: LAYOUT.headerHeight, px: { xs: 4, md: `${LAYOUT.railInset}px` }, gap: 3 }}>
        <IconButton size="small" onClick={() => setMobileOpen(true)} aria-label="Open navigation" sx={{ display: { md: "none" } }}>
          <MenuOutlined fontSize="small" />
        </IconButton>
        <Box component={Link} href="/" aria-label="NUVIOR Prime home" sx={{ display: { xs: "flex", md: "none" } }}>
          <BrandMark size={32} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flex: 1 }}>
          {/* Keyed on the route so the entrance replays on every navigation. */}
          <Box component="nav" aria-label="breadcrumb" key={pathname} sx={{ minWidth: 0 }}>
            <Box component="ol" sx={{ display: "flex", alignItems: "center", m: 0, mx: { md: -1 }, p: 0, listStyle: "none", minWidth: 0 }}>
              {all.map((c, i) => {
                const last = i === all.length - 1;
                return (
                  <Box
                    component="li"
                    key={c.href}
                    sx={{
                      display: last ? "flex" : { xs: "none", sm: "flex" },
                      alignItems: "center",
                      minWidth: 0,
                      animation: `${crumbIn} 360ms ${EASE} both`,
                      animationDelay: `${i * 70}ms`,
                      [REDUCED]: { animation: "none" },
                    }}
                  >
                    {i > 0 && <ChevronRightRounded aria-hidden sx={{ fontSize: 18, color: "text.disabled", display: { xs: "none", sm: "block" } }} />}
                    {last ? (
                      <Typography
                        variant="body2"
                        component="span"
                        noWrap
                        aria-current="page"
                        sx={{
                          position: "relative",
                          px: 1,
                          py: 0.5,
                          fontWeight: 600,
                          color: "text.primary",
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            left: 4,
                            right: 4,
                            bottom: -2,
                            height: 2,
                            borderRadius: 1,
                            bgcolor: "primary.main",
                            transformOrigin: "left center",
                            animation: `${underline} 420ms ${EASE} both`,
                            animationDelay: `${i * 70 + 180}ms`,
                            [REDUCED]: { animation: "none" },
                          },
                        }}
                      >
                        {c.label}
                      </Typography>
                    ) : (
                      <Typography
                        component={Link}
                        href={c.href}
                        variant="body2"
                        noWrap
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          color: "text.secondary",
                          textDecoration: "none",
                          transition: (t) => t.transitions.create(["color", "background-color"], { duration: t.transitions.duration.short }),
                          "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                        }}
                      >
                        {c.label}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mr: user ? { md: -1.5 } : 0,
            "html[data-native-app] &": { mr: 0 },
            animation: `${settle} 420ms ${EASE} both`,
            animationDelay: "120ms",
            [REDUCED]: { animation: "none" },
          }}
        >
          {/* Today's Route: the rep's live-location switch leads the right-hand actions. */}
          {pathname === "/" && user && hasPermission(user.role as AppRoleName, "position.report") && (
            <Box sx={{ flexShrink: 0 }}>
              <LiveLocationToggle />
            </Box>
          )}
          <Box
            sx={{
              display: { xs: "none", xl: "inline-flex" },
              alignItems: "center",
              gap: 1.5,
              height: 34,
              px: 3,
              borderRadius: 999,
              bgcolor: "background.sunken",
              color: "text.secondary",
            }}
          >
            <CalendarTodayOutlined aria-hidden sx={{ fontSize: 14 }} />
            <Typography variant="body2" sx={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
              {today}
            </Typography>
          </Box>
          {/* No search button on narrow screens (under 990px) or in the iOS app; a keyboard's ⌘K still opens the palette. */}
          <Box
            sx={{
              display: "none",
              "@media (min-width: 990px)": { display: "block" },
              "html[data-native-app] &": { display: "none" },
            }}
          >
            <CommandSearch groups={groups} />
          </Box>
          {/* On phones (under md) and in the iOS app the account lives in the navigation drawer instead. */}
          {user && (
            <Box sx={{ display: { xs: "none", md: "block" }, "html[data-native-app] &": { display: "none" } }}>
              <UserMenu user={user} signOutAction={signOutAction} />
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
