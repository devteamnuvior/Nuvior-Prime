"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import type { AppRoleName } from "@/domain/auth/permissions";
import { STAT_EASE, STAT_FILL_MS, StatBar, StatCard, StatRing, useMounted } from "@/components/feedback/StatCard";
import { ROLE_META } from "./userPresentation";

const ROLE_COLOR: Record<AppRoleName, string> = {
  ADMIN: "background.inverse",
  MANAGER: "primary.main",
  REP: "primary.light",
};

function RoleBreakdown({ byRole, total, mounted }: { byRole: { role: AppRoleName; count: number }[]; total: number; mounted: boolean }) {
  const parts = byRole.filter((b) => b.count > 0);
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        aria-hidden
        sx={{
          display: "flex",
          height: 6,
          borderRadius: 999,
          bgcolor: "grey.200",
          overflow: "hidden",
          gap: "2px",
        }}
      >
        {parts.map((b, i) => (
          <Box
            key={b.role}
            sx={{
              width: mounted ? `${(b.count / Math.max(1, total)) * 100}%` : 0,
              bgcolor: ROLE_COLOR[b.role],
              borderRadius: 999,
              transition: `width ${STAT_FILL_MS}ms ${STAT_EASE}`,
              transitionDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 1 }}>
        {byRole.map((b) => (
          <Box
            key={b.role}
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
              fontSize: "0.75rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: ROLE_COLOR[b.role],
                opacity: b.count ? 1 : 0.35,
              }}
            />
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                color: b.count ? "text.primary" : "text.disabled",
              }}
            >
              {b.count}
            </Box>
            {ROLE_META[b.role].short}
            {b.role === "REP" && b.count !== 1 ? "s" : ""}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function TeamStats({ total, active, disabled, recent, byRole }: { total: number; active: number; disabled: number; recent: number; byRole: { role: AppRoleName; count: number }[] }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mounted = useMounted() || reduceMotion;
  const animate = !reduceMotion;
  const activeRatio = total ? active / total : 0;
  const recentRatio = active ? recent / active : 0;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 3,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
      }}
    >
      <StatCard index={0} label="Total Users" value={total} icon={PeopleOutlined} tone="neutral" animate={animate} footer={<RoleBreakdown byRole={byRole} total={total} mounted={mounted} />} />
      <StatCard
        index={1}
        label="Active"
        value={active}
        icon={CheckCircleOutlineOutlined}
        tone="success"
        animate={animate}
        aside={<StatRing ratio={activeRatio} tone="success" mounted={mounted} label={`${active} of ${total} accounts can sign in`} />}
        footer={
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {total === 0 ? "No accounts yet" : active === total ? "Everyone can sign in" : `${total - active} cannot sign in`}
          </Typography>
        }
      />
      <StatCard
        index={2}
        label="Disabled"
        value={disabled}
        icon={BlockOutlined}
        tone={disabled ? "warning" : "neutral"}
        animate={animate}
        footer={
          <Typography
            variant="body2"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: disabled ? "warning.main" : "text.secondary",
            }}
          >
            {disabled === 0 && <TaskAltOutlined sx={{ fontSize: 16, color: "success.main" }} aria-hidden />}
            {disabled === 0 ? "No disabled accounts" : disabled === 1 ? "1 account signed out" : `${disabled} accounts signed out`}
          </Typography>
        }
      />
      <StatCard
        index={3}
        label="Signed in · 30 days"
        value={recent}
        icon={LoginOutlined}
        tone="primary"
        animate={animate}
        footer={
          <Box sx={{ display: "grid", gap: 2 }}>
            <StatBar ratio={recentRatio} tone="primary" mounted={mounted} />
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {active ? `${Math.round(recentRatio * 100)}% of ${active} active` : "No active accounts"}
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
