"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import type { SvgIconComponent } from "@mui/icons-material";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import RepeatOutlined from "@mui/icons-material/RepeatOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import StarOutlineOutlined from "@mui/icons-material/StarOutlineOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import type { BadgeDefinition } from "@/domain/performance/xp";

const ICONS: Record<BadgeDefinition["icon"], SvgIconComponent> = {
  route: RouteOutlined,
  school: SchoolOutlined,
  star: StarOutlineOutlined,
  bolt: BoltOutlined,
  cart: ShoppingCartOutlined,
  repeat: RepeatOutlined,
  trophy: EmojiEventsOutlined,
  flag: FlagOutlined,
};

/** Round badge token: filled when earned, outlined with a lock when not. */
export function BadgeIcon({ badge, earned, size = 36, hint }: { badge: BadgeDefinition; earned: boolean; size?: number; hint?: string }) {
  const Icon = ICONS[badge.icon];
  const title = `${badge.name} — ${badge.description}${hint ? ` ${hint}` : ""}`;
  return (
    <Tooltip title={title} arrow>
      <Box
        role="img"
        aria-label={title}
        sx={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: earned ? "rgba(var(--nv-palette-success-mainChannel) / 0.14)" : "background.sunken",
          color: earned ? "success.main" : "text.disabled",
          border: 1,
          borderColor: earned ? "rgba(var(--nv-palette-success-mainChannel) / 0.4)" : "divider",
        }}
      >
        <Icon sx={{ fontSize: size * 0.5 }} />
        {!earned && (
          <Box sx={{ position: "absolute", right: -2, bottom: -2, width: size * 0.4, height: size * 0.4, borderRadius: "50%", bgcolor: "background.paper", display: "flex", alignItems: "center", justifyContent: "center", border: 1, borderColor: "divider" }}>
            <LockOutlined sx={{ fontSize: size * 0.24, color: "text.disabled" }} />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
