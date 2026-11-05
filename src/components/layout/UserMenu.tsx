"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import { EASE } from "@/theme/tokens";
import { DetailRow, IconTile, RingedAvatar, identityRise as rise } from "@/components/feedback/Identity";
import type { ShellUser } from "./shell-context";

const REDUCED = "@media (prefers-reduced-motion: reduce)";

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
        <RingedAvatar initials={user.initials} size={28} dot={10} />
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
        slotProps={{
          paper: { sx: { width: 300, mt: 2, overflow: "hidden", borderRadius: 4, boxShadow: (t) => (t.vars ?? t).shadows[3] } },
          list: { sx: { p: 0 } },
        }}
      >
        {/* Identity band: a soft primary wash fading into the paper. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            px: 4,
            pt: 4,
            pb: 3.5,
            background: "linear-gradient(180deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 100%)",
            animation: `${rise} 320ms ${EASE} both`,
            [REDUCED]: { animation: "none" },
          }}
        >
          <RingedAvatar initials={user.initials} size={44} dot={12} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.3 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            px: 2,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "grid",
            gap: 0.5,
            animation: `${rise} 320ms ${EASE} 60ms both`,
            [REDUCED]: { animation: "none" },
          }}
        >
          <DetailRow icon={<ShieldOutlined />} label="Role" value={user.roleLabel} />
          <DetailRow icon={<PlaceOutlined />} label="Territory" value={user.territory} />
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", animation: `${rise} 320ms ${EASE} 120ms both`, [REDUCED]: { animation: "none" } }}>
          <form ref={formRef} action={signOutAction}>
            <MenuItem
              onClick={() => formRef.current?.requestSubmit()}
              sx={{
                px: 2,
                py: 1.5,
                gap: 3,
                borderRadius: 999,
                color: "error.main",
                transition: (t) => t.transitions.create("background-color", { duration: t.transitions.duration.short }),
                "&:hover, &.Mui-focusVisible": { bgcolor: "error.tint" },
              }}
            >
              <IconTile tone="danger">
                <LogoutOutlined />
              </IconTile>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit", lineHeight: 1.3 }}>
                  Sign out
                </Typography>
              </Box>
            </MenuItem>
          </form>
        </Box>
      </Menu>
    </>
  );
}
