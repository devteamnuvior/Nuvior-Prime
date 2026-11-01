"use client";

import * as React from "react";
import { keyframes } from "@emotion/react";
import Avatar from "@mui/material/Avatar";
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
import type { ShellUser } from "./shell-context";

/* Presence dot: a soft ring expands and fades every few seconds. */
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(var(--nv-palette-success-mainChannel) / 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0); }
`;

/* Menu sections rise into place one after another each time the menu opens. */
const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const REDUCED = "@media (prefers-reduced-motion: reduce)";

/** Avatar inside a 2px gradient ring with a pulsing presence dot. Shared by the trigger and the menu's identity band. */
function RingedAvatar({ initials, size, dot }: { initials: string; size: number; dot: number }) {
  return (
    <Box sx={{ position: "relative", display: "flex", flexShrink: 0 }}>
      <Box
        aria-hidden
        sx={{
          p: "2px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--nv-palette-primary-light), var(--nv-palette-primary-dark))",
          display: "flex",
        }}
      >
        <Avatar sx={{ width: size, height: size, fontSize: size * 0.34, fontWeight: 600, border: "2px solid", borderColor: "background.paper", boxSizing: "content-box" }}>
          {initials}
        </Avatar>
      </Box>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: dot,
          height: dot,
          borderRadius: "50%",
          bgcolor: "success.main",
          border: "2px solid",
          borderColor: "background.paper",
          animation: `${pulse} 2.8s ease-out infinite`,
          [REDUCED]: { animation: "none" },
        }}
      />
    </Box>
  );
}

/** Icon in a soft rounded tile, so the three rows of the menu share one icon column. */
function IconTile({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 30,
        height: 30,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        bgcolor: tone === "danger" ? "error.tint" : "background.sunken",
        color: tone === "danger" ? "error.main" : "text.secondary",
        "& svg": { fontSize: 16 },
      }}
    >
      {children}
    </Box>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3, px: 2, py: 1.5 }}>
      <IconTile>{icon}</IconTile>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="eyebrow" sx={{ display: "block", color: "text.faint", fontSize: "0.625rem" }}>
          {label}
        </Typography>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: "text.primary" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

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
                borderRadius: 2,
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
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  End this session on this device
                </Typography>
              </Box>
            </MenuItem>
          </form>
        </Box>
      </Menu>
    </>
  );
}
