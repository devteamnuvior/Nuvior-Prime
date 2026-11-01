"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import DateRangeOutlined from "@mui/icons-material/DateRangeOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import MailOutlined from "@mui/icons-material/MailOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import type { RepProfileDto } from "@/lib/repProfile";
import { EASE } from "@/theme/tokens";
import { DetailRow, RingedAvatar, identityRise as rise, initialsOf } from "@/components/feedback/Identity";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { TerritoryBadges } from "../ProvinceBadge";
import { ROLE_META, avatarHue, formatDate, formatRelative } from "../userPresentation";

const REDUCED = "@media (prefers-reduced-motion: reduce)";
const DAY = 24 * 60 * 60 * 1000;

/**
 * The team member's identity, laid out like the account menu: a tinted band with the ringed
 * avatar, name and email, then labelled detail rows that rise in one after another.
 */
export function ProfileIdentityCard({ user, range, isViewer, renderedAt, actions }: { user: RepProfileDto["user"]; range: RepProfileDto["range"]; isViewer: boolean; renderedAt: number; actions?: React.ReactNode }) {
  const active = user.status === "ACTIVE";
  // "Present" when the account is active and was used in the last day.
  const present = active && !!user.lastLoginAt && renderedAt - new Date(user.lastLoginAt).getTime() < DAY;

  return (
    <Card sx={{ overflow: "hidden", mb: 6 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 4,
          px: 5,
          pt: 5,
          pb: 4,
          background: active ? "linear-gradient(180deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 100%)" : "linear-gradient(180deg, var(--nv-palette-background-sunken) 0%, var(--nv-palette-background-paper) 100%)",
          animation: `${rise} 360ms ${EASE} both`,
          [REDUCED]: { animation: "none" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <RingedAvatar initials={initialsOf(user.displayName)} size={64} dot={14} present={present} hue={avatarHue(user.email)} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="eyebrow" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
              {ROLE_META[user.role].label}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="h1" component="h1" sx={{ lineHeight: 1.15 }}>
                {user.displayName}
              </Typography>
              {isViewer && <CodeChip label="You" />}
              <StatusChip tone={active ? "success" : "neutral"} label={active ? "Active" : "Disabled"} />
            </Box>
            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", mt: 1 }}>
              <MailOutlined sx={{ fontSize: 16 }} aria-hidden />
              {user.email}
            </Typography>
          </Box>
        </Box>
        {actions}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
          gap: 2,
          px: 3,
          py: 2.5,
          borderTop: 1,
          borderColor: "divider",
          animation: `${rise} 360ms ${EASE} 80ms both`,
          [REDUCED]: { animation: "none" },
          "& > *": { animation: `${rise} 320ms ${EASE} both`, [REDUCED]: { animation: "none" } },
          ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`& > :nth-of-type(${i + 1})`, { animationDelay: `${120 + i * 50}ms` }])),
        }}
      >
        <DetailRow icon={<ShieldOutlined />} label="Role" value={ROLE_META[user.role].label} tone="primary" />
        <DetailRow icon={<PlaceOutlined />} label="Territory" value={<TerritoryBadges codes={user.provinces} />} />
        <DetailRow icon={<LoginOutlined />} label="Last active" value={formatRelative(user.lastLoginAt, renderedAt)} />
        <DetailRow icon={<CalendarMonthOutlined />} label="Member since" value={formatDate(user.createdAt)} />
        <DetailRow icon={<DateRangeOutlined />} label="Range" value={`${range.start} → ${range.end}`} />
      </Box>
    </Card>
  );
}
