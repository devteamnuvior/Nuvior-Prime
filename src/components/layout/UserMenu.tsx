"use client";

import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import type { ShellUser } from "./shell-context";

export function UserMenu({ user, signOutAction }: { user: ShellUser; signOutAction: () => Promise<void> }) {
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        sx={{ display: "flex", alignItems: "center", gap: 2, px: 1.5, py: 0.75, borderRadius: 1.5, "&:hover": { bgcolor: "action.hover" } }}
      >
        <Avatar sx={{ width: 28, height: 28 }}>{user.initials}</Avatar>
        <Typography variant="body2" sx={{ fontWeight: 500, display: { xs: "none", lg: "block" }, maxWidth: 160 }} noWrap>
          {user.name}
        </Typography>
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 260 } } }}
      >
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.name}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
            {user.email}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 2.5, py: 1, display: "grid", gap: 1, color: "text.secondary", fontSize: "0.8125rem" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ShieldOutlined sx={{ fontSize: 16 }} aria-hidden /> {user.roleLabel}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <PlaceOutlined sx={{ fontSize: 16 }} aria-hidden /> {user.territory}
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <form ref={formRef} action={signOutAction}>
          <MenuItem onClick={() => formRef.current?.requestSubmit()} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}>
              <LogoutOutlined fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </form>
      </Menu>
    </>
  );
}
