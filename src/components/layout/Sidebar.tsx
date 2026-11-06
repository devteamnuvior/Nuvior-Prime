"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import { LAYOUT } from "@/theme/tokens";
import { IconTile, RingedAvatar } from "@/components/feedback/Identity";
import { BrandMark, BrandWordmark } from "./BrandMark";
import { SidebarNav } from "./SidebarNav";
import { useShell } from "./shell-context";
import type { NavGroup } from "./nav";

export function Sidebar({ groups, signOutAction }: { groups: NavGroup[]; signOutAction: () => Promise<void> }) {
  const { mobileOpen, setMobileOpen, user } = useShell();
  // Desktop is a fixed icon rail; the full nav with labels only exists in the mobile drawer.
  const width = LAYOUT.sidebarCollapsedWidth;

  const brand = (
    <Box
      sx={{
        // Content-box so the 1px border sits below headerHeight, on the same line as the header's own bottom border.
        height: LAYOUT.headerHeight,
        boxSizing: "content-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: 1,
        borderColor: "sidebar.border",
        flexShrink: 0,
      }}
    >
      <Box component={Link} href="/" aria-label="NUVIOR Prime home" sx={{ display: "flex", alignItems: "center", color: "inherit", textDecoration: "none", borderRadius: 1 }}>
        <BrandMark size={LAYOUT.brandMarkSize} />
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop: permanent mini-variant drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width,
            overflowX: "hidden",
            boxSizing: "border-box",
            bgcolor: "sidebar.bg",
            borderRight: 1,
            borderColor: "sidebar.border",
            boxShadow: "none",
          },
        }}
      >
        {brand}
        <SidebarNav groups={groups} collapsed />
      </Drawer>

      {/* Mobile: temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: 288, boxSizing: "border-box", bgcolor: "sidebar.bg" } }}
      >
        <Box sx={{ height: LAYOUT.headerHeight, boxSizing: "content-box", display: "flex", alignItems: "center", gap: 1.5, px: 3, borderBottom: 1, borderColor: "sidebar.border" }}>
          <BrandMark />
          <BrandWordmark />
        </Box>
        <SidebarNav groups={groups} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        {/* Account: on phones and in the iOS app this replaces the header's avatar menu. */}
        {user && (
          <Box sx={{ mt: "auto", borderTop: 1, borderColor: "sidebar.border", px: 3, py: 3, display: "grid", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, px: 1 }}>
              <RingedAvatar initials={user.initials} size={40} dot={11} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block" }}>
                  {user.roleLabel} · {user.territory}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: "text.disabled", display: "block" }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <form action={signOutAction}>
              <ButtonBase
                type="submit"
                sx={{
                  width: 1,
                  justifyContent: "flex-start",
                  gap: 2.5,
                  px: 1,
                  py: 1.25,
                  borderRadius: 999,
                  color: "error.main",
                  "&:hover, &.Mui-focusVisible": { bgcolor: "error.tint" },
                }}
              >
                <IconTile tone="danger">
                  <LogoutOutlined />
                </IconTile>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
                  Sign out
                </Typography>
              </ButtonBase>
            </form>
          </Box>
        )}
      </Drawer>
    </>
  );
}
