"use client";

import * as React from "react";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { SvgIconComponent } from "@mui/icons-material";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import type { AppRoleName } from "@/domain/auth/permissions";
import { ROLE_META } from "./userPresentation";

type Tone = "neutral" | "primary" | "success" | "warning";

const TONE: Record<Tone, { bg: string; fg: string; glow: string }> = {
  neutral: {
    bg: "background.sunken",
    fg: "text.secondary",
    glow: "rgba(var(--nv-palette-text-secondaryChannel) / 0.10)",
  },
  primary: {
    bg: "action.selected",
    fg: "primary.main",
    glow: "rgba(var(--nv-palette-primary-mainChannel) / 0.16)",
  },
  success: {
    bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)",
    fg: "success.main",
    glow: "rgba(var(--nv-palette-success-mainChannel) / 0.16)",
  },
  warning: {
    bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.14)",
    fg: "warning.main",
    glow: "rgba(var(--nv-palette-warning-mainChannel) / 0.18)",
  },
};

const ROLE_COLOR: Record<AppRoleName, string> = {
  ADMIN: "background.inverse",
  MANAGER: "primary.main",
  REP: "primary.light",
};

const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const COUNT_MS = 900;
const FILL_MS = 1100;
const EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";

/** Eases a number from its previous value to `target` over `duration`; instant when `animate` is false. */
function useCountUp(target: number, animate: boolean, duration = COUNT_MS) {
  const [value, setValue] = React.useState(animate ? 0 : target);
  const fromRef = React.useRef(animate ? 0 : target);
  React.useEffect(() => {
    if (!animate) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);
  return value;
}

/** True once mounted on the client; drives the enter transitions so SSR renders the resting state. */
function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

function StatCard({
  index,
  label,
  value,
  icon: Icon,
  tone,
  animate,
  aside,
  footer,
}: {
  index: number;
  label: string;
  value: number;
  icon: SvgIconComponent;
  tone: Tone;
  animate: boolean;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = TONE[tone];
  const shown = useCountUp(value, animate);
  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        px: 5,
        py: 4,
        display: "grid",
        gap: 3,
        animation: animate ? `${rise} 560ms ${EASE} both` : "none",
        animationDelay: `${index * 90}ms`,
        transition: (th) =>
          th.transitions.create(["transform", "box-shadow"], {
            duration: th.transitions.duration.short,
          }),
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
        "&::before": {
          content: '""',
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${t.glow}, transparent)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Typography variant="eyebrow">{label}</Typography>
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1.5,
            bgcolor: t.bg,
            color: t.fg,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Typography
          variant="h1"
          component="span"
          sx={{
            fontSize: "2rem",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: tone === "primary" ? "primary.main" : "text.primary",
          }}
        >
          {shown}
          {/* Keep the real value in the tree for screen readers while the count animates. */}
          <Box
            component="span"
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
            }}
          >
            {value}
          </Box>
        </Typography>
        {aside}
      </Box>
      {footer}
    </Card>
  );
}

function Ring({ ratio, tone, mounted, label }: { ratio: number; tone: Tone; mounted: boolean; label: string }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(ratio * 100);
  return (
    <Tooltip title={label} arrow>
      <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }} aria-label={label} role="img">
        <Box component="svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} sx={{ display: "block", transform: "rotate(-90deg)" }}>
          <Box component="circle" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} sx={(t) => ({ stroke: (t.vars ?? t).palette.grey[200] })} />
          <Box
            component="circle"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? c * (1 - ratio) : c}
            sx={(t) => ({
              stroke: tone === "success" ? (t.vars ?? t).palette.success.main : (t.vars ?? t).palette.primary.main,
              transition: `stroke-dashoffset ${FILL_MS}ms ${EASE}`,
            })}
          />
        </Box>
        <Typography
          component="span"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.625rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
          }}
        >
          {pct}%
        </Typography>
      </Box>
    </Tooltip>
  );
}

function Bar({ ratio, tone, mounted }: { ratio: number; tone: Tone; mounted: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        height: 6,
        borderRadius: 999,
        bgcolor: "grey.200",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: 1,
          width: mounted ? `${Math.max(0, Math.min(1, ratio)) * 100}%` : 0,
          borderRadius: 999,
          bgcolor: TONE[tone].fg,
          transition: `width ${FILL_MS}ms ${EASE}`,
        }}
      />
    </Box>
  );
}

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
              transition: `width ${FILL_MS}ms ${EASE}`,
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
        aside={<Ring ratio={activeRatio} tone="success" mounted={mounted} label={`${active} of ${total} accounts can sign in`} />}
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
            <Bar ratio={recentRatio} tone="primary" mounted={mounted} />
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
