"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MenuOpenOutlined from "@mui/icons-material/MenuOpenOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import { LAYOUT } from "@/theme/tokens";
import { BrandMark, BrandWordmark } from "./BrandMark";
import { SidebarNav } from "./SidebarNav";
import { useShell } from "./shell-context";
import type { NavGroup } from "./nav";

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen, user } = useShell();
  const width = collapsed ? LAYOUT.sidebarCollapsedWidth : LAYOUT.sidebarWidth;

  const brand = (
    <Box
      sx={{
        height: LAYOUT.headerHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 2.5,
        px: collapsed ? 0 : 4,
        borderBottom: 1,
        borderColor: "sidebar.border",
        flexShrink: 0,
      }}
    >
      <Box component={Link} href="/" aria-label="NUVIOR Prime home" sx={{ display: "flex", alignItems: "center", gap: 2.5, color: "inherit", textDecoration: "none", borderRadius: 1 }}>
        <BrandMark />
        {!collapsed && <BrandWordmark />}
      </Box>
    </Box>
  );

  const footer = (
    <Box sx={{ borderTop: 1, borderColor: "sidebar.border", p: collapsed ? 2 : 3, flexShrink: 0 }}>
      {user && !collapsed && (
        <Box sx={{ px: 1.5, mb: 2, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {user.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block" }}>
            {user.roleLabel} · {user.territory}
          </Typography>
        </Box>
      )}
      <Tooltip title={`${collapsed ? "Expand" : "Collapse"} sidebar ( [ )`} placement="right">
        {collapsed ? (
          <IconButton size="small" onClick={toggleCollapsed} aria-label="Expand sidebar" aria-expanded={false} sx={{ color: "text.secondary", display: "flex", mx: "auto" }}>
            <MenuOutlined fontSize="small" />
          </IconButton>
        ) : (
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            aria-expanded
            startIcon={<MenuOpenOutlined />}
            sx={{ justifyContent: "flex-start", color: "text.secondary" }}
          >
            Collapse
            <Box component="kbd" sx={{ ml: "auto", px: 1, borderRadius: 0.5, border: 1, borderColor: "divider", fontSize: "0.6875rem", fontFamily: "inherit", color: "text.disabled" }}>
              [
            </Box>
          </Button>
        )}
      </Tooltip>
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
          transition: (t) => t.transitions.create("width", { duration: t.transitions.duration.standard }),
          "& .MuiDrawer-paper": {
            width,
            overflowX: "hidden",
            boxSizing: "border-box",
            bgcolor: "sidebar.bg",
            borderRight: 1,
            borderColor: "sidebar.border",
            boxShadow: "none",
            transition: (t) => t.transitions.create("width", { duration: t.transitions.duration.standard }),
          },
        }}
      >
        {brand}
        <SidebarNav groups={groups} collapsed={collapsed} />
        {footer}
      </Drawer>

      {/* Mobile: temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: 288, boxSizing: "border-box", bgcolor: "sidebar.bg" } }}
      >
        <Box sx={{ height: LAYOUT.headerHeight, display: "flex", alignItems: "center", gap: 2.5, px: 4, borderBottom: 1, borderColor: "sidebar.border" }}>
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
