"use client";

import * as React from "react";
import { keyframes } from "@emotion/react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import type { ShellUser } from "./shell-context";

/* Presence dot: a soft ring expands and fades every few seconds. */
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(var(--nv-palette-success-mainChannel) / 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0); }
`;

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
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          height: 40,
          pl: 1,
          pr: 1.5,
          borderRadius: 999,
          transition: (t) => t.transitions.create(["background-color", "box-shadow", "transform"], { duration: t.transitions.duration.short }),
          "&:hover": { bgcolor: "action.hover" },
          "&.Mui-focusVisible": { boxShadow: (t) => `0 0 0 3px ${(t.vars ?? t).palette.action.focus}` },
          "& .nv-user-chevron": { transition: (t) => t.transitions.create("transform", { duration: t.transitions.duration.standard }) },
          "@media (prefers-reduced-motion: reduce)": { transition: "none", "& .nv-user-chevron": { transition: "none" } },
        }}
      >
        <Box sx={{ position: "relative", display: "flex" }}>
          {/* Gradient ring: the avatar sits inside a 2px padded gradient disc. */}
          <Box
            aria-hidden
            sx={{
              p: "2px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--nv-palette-primary-light), var(--nv-palette-primary-dark))",
              display: "flex",
            }}
          >
            <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", fontWeight: 600, border: "2px solid", borderColor: "background.paper", boxSizing: "content-box" }}>
              {user.initials}
            </Avatar>
          </Box>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "success.main",
              border: "2px solid",
              borderColor: "background.paper",
              animation: `${pulse} 2.8s ease-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: "none", lg: "block" }, maxWidth: 160 }} noWrap>
          {user.name}
        </Typography>
        <ExpandMoreIcon className="nv-user-chevron" aria-hidden sx={{ fontSize: 18, color: "text.disabled", display: { xs: "none", lg: "block" }, transform: anchor ? "rotate(180deg)" : "none" }} />
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
