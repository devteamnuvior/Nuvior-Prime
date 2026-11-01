"use client";

import * as React from "react";
import { keyframes } from "@emotion/react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const REDUCED = "@media (prefers-reduced-motion: reduce)";

/* Presence dot: a soft ring expands and fades every few seconds. */
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(var(--nv-palette-success-mainChannel) / 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--nv-palette-success-mainChannel) / 0); }
`;

/* Sections rise into place one after another. */
export const identityRise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Initials from a display name: first letters of the first two words. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Avatar inside a 2px gradient ring with a presence dot. `present` draws the green pulsing dot;
 * otherwise the dot is grey and still. Used by the account menu and the team-member profile.
 */
export function RingedAvatar({ initials, size, dot, present = true, hue }: { initials: string; size: number; dot: number; present?: boolean; hue?: number }) {
  return (
    <Box sx={{ position: "relative", display: "flex", flexShrink: 0 }}>
      <Box
        aria-hidden
        sx={{
          p: "2px",
          borderRadius: "50%",
          background: present ? "linear-gradient(135deg, var(--nv-palette-primary-light), var(--nv-palette-primary-dark))" : "linear-gradient(135deg, var(--nv-palette-grey-300), var(--nv-palette-grey-400))",
          display: "flex",
        }}
      >
        <Avatar
          sx={{
            width: size,
            height: size,
            fontSize: size * 0.34,
            fontWeight: 600,
            border: "2px solid",
            borderColor: "background.paper",
            boxSizing: "content-box",
            ...(hue != null && { bgcolor: `hsl(${hue} 30% 90%)`, color: `hsl(${hue} 45% 28%)` }),
          }}
        >
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
          bgcolor: present ? "success.main" : "text.disabled",
          border: "2px solid",
          borderColor: "background.paper",
          animation: present ? `${pulse} 2.8s ease-out infinite` : "none",
          [REDUCED]: { animation: "none" },
        }}
      />
    </Box>
  );
}

/** Icon in a soft rounded tile, so detail rows share one icon column. */
export function IconTile({ children, tone = "neutral", size = 30 }: { children: React.ReactNode; tone?: "neutral" | "danger" | "primary" | "success"; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        bgcolor: tone === "danger" ? "error.tint" : tone === "primary" ? "primary.tint" : tone === "success" ? "success.tint" : "background.sunken",
        color: tone === "danger" ? "error.main" : tone === "primary" ? "primary.main" : tone === "success" ? "success.main" : "text.secondary",
        "& svg": { fontSize: Math.round(size * 0.53) },
      }}
    >
      {children}
    </Box>
  );
}

/** Icon tile, small uppercase label, and the value underneath. */
export function DetailRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "neutral" | "primary" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3, px: 2, py: 1.5, minWidth: 0 }}>
      <IconTile tone={tone}>{icon}</IconTile>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="eyebrow" sx={{ display: "block", color: "text.faint", fontSize: "0.625rem" }}>
          {label}
        </Typography>
        {typeof value === "string" ? (
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: "text.primary" }}>
            {value}
          </Typography>
        ) : (
          <Box sx={{ mt: 0.5 }}>{value}</Box>
        )}
      </Box>
    </Box>
  );
}
