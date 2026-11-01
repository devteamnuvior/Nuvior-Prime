"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { LAYOUT } from "@/theme/tokens";
import { BrandMark, BrandWordmark } from "./BrandMark";
import { SidebarNav } from "./SidebarNav";
import { useShell } from "./shell-context";
import type { NavGroup } from "./nav";

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const { mobileOpen, setMobileOpen, user } = useShell();
  // Desktop is a fixed icon rail; the full nav with labels only exists in the mobile drawer.
  const width = LAYOUT.sidebarCollapsedWidth;

  const brand = (
    <Box
      sx={{
        height: LAYOUT.headerHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: 1,
        borderColor: "sidebar.border",
        flexShrink: 0,
      }}
    >
      <Box component={Link} href="/" aria-label="NUVIOR Prime home" sx={{ display: "flex", alignItems: "center", color: "inherit", textDecoration: "none", borderRadius: 1 }}>
        <BrandMark />
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
        <Box sx={{ height: LAYOUT.headerHeight, display: "flex", alignItems: "center", gap: 1.5, px: 3, borderBottom: 1, borderColor: "sidebar.border" }}>
          <BrandMark />
          <BrandWordmark />
        </Box>
        <SidebarNav groups={groups} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        {user && (
          <Box sx={{ borderTop: 1, borderColor: "sidebar.border", px: 4, py: 3 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block" }}>
              {user.roleLabel} · {user.territory}
            </Typography>
          </Box>
        )}
      </Drawer>
    </>
  );
}
