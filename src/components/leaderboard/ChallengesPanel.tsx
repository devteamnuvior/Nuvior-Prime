"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import { removeChallengeAction } from "@/app/actions";
import type { ChallengeRow } from "@/lib/xp";
import { POINT_RULES } from "@/domain/performance/xp";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { HeroButton } from "@/components/feedback/HeroButton";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { toast } from "@/components/feedback/toast";
import { CreateChallengeDrawer } from "./CreateChallengeDrawer";
import { MultiplierBadge } from "./MultiplierBadge";
import { daysLeft, elapsedFraction, formatDayRange } from "./challengeFormat";

const STATE: Record<ChallengeRow["state"], { label: string; tone: "success" | "info" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  upcoming: { label: "Upcoming", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
};

function ChallengeCard({ c, today, canManage, pending, onRemove }: { c: ChallengeRow; today: string; canManage: boolean; pending: boolean; onRemove: () => void }) {
  const s = STATE[c.state];
  const active = c.state === "active";
  const rule = POINT_RULES[c.reason];
  const left = daysLeft(c, today);
  const elapsed = elapsedFraction(c, today);
  const timing = active ? `${left} day${left === 1 ? "" : "s"} left` : c.state === "upcoming" ? `starts in ${Math.max(1, daysLeft({ endsOn: c.startsOn }, today) - 1)} day${daysLeft({ endsOn: c.startsOn }, today) - 1 === 1 ? "" : "s"}` : "ended";

  return (
    <Box
      component="li"
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "flex-start",
        gap: 3,
        p: 4,
        pb: active ? 5 : 4,
        borderRadius: 3,
        border: 1,
        borderColor: active ? "rgba(var(--nv-palette-primary-mainChannel) / 0.25)" : "divider",
        background: active ? "linear-gradient(135deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 70%)" : "background.paper",
        "&:hover .nv-challenge-remove": { opacity: 1 },
      }}
    >
      <MultiplierBadge multiplier={c.multiplier} active={active} />
      <Box sx={{ minWidth: 0, display: "grid", gap: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {c.title}
          </Typography>
          <StatusChip dot={false} uppercase tone={s.tone} label={s.label} />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {rule.label} · {rule.points} XP becomes{" "}
          <Box component="span" sx={{ color: active ? "primary.main" : "text.primary", fontWeight: 600 }}>
            {Math.round(rule.points * c.multiplier)} XP
          </Box>
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {formatDayRange(c.startsOn, c.endsOn)} · {timing}
          {c.createdByName ? ` · by ${c.createdByName}` : ""}
        </Typography>
        {c.description && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {c.description}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
          {c.provinceCodes.length ? c.provinceCodes.map((p) => <CodeChip key={p} label={p} />) : <CodeChip label="All provinces" />}
        </Box>
      </Box>
      {canManage ? (
        <Tooltip title="Remove challenge">
          <span>
            <IconButton
              className="nv-challenge-remove"
              size="small"
              aria-label={`Remove ${c.title}`}
              disabled={pending}
              onClick={onRemove}
              sx={{ opacity: { xs: 1, md: 0 }, transition: (t) => t.transitions.create("opacity", { duration: t.transitions.duration.short }), "&:focus-visible": { opacity: 1 } }}
            >
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <span />
      )}
      {/* Time elapsed across the window, along the bottom edge of an active card. */}
      {active && (
        <Box aria-hidden sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, bgcolor: "rgba(var(--nv-palette-primary-mainChannel) / 0.12)" }}>
          <Box sx={{ height: 1, width: `${Math.round(elapsed * 100)}%`, bgcolor: "primary.main", borderRadius: "0 2px 2px 0", transition: "width 600ms ease" }} />
        </Box>
      )}
    </Box>
  );
}

export function ChallengesPanel({ challenges, canManage, viewerProvinces, today }: { challenges: ChallengeRow[]; canManage: boolean; viewerProvinces: string[]; today: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState<ChallengeRow | null>(null);

  const visible = challenges.filter((c) => c.state !== "ended");

  return (
    <Card sx={{ p: 5, display: "grid", gap: 4, alignContent: "start", flex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h2">
            Challenges
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            A window where one kind of win is worth more.
          </Typography>
        </Box>
        {canManage && (
          <HeroButton startIcon={<EmojiEventsOutlined />} onClick={() => setOpen(true)} sx={{ height: 36, px: 4 }}>
            New challenge
          </HeroButton>
        )}
      </Box>

      {visible.length === 0 ? (
        <Box sx={{ display: "grid", gap: 1, justifyItems: "center", textAlign: "center", py: 6, px: 4, borderRadius: 3, border: 1, borderStyle: "dashed", borderColor: "divider" }}>
          <EmojiEventsOutlined sx={{ fontSize: 28, color: "text.disabled" }} aria-hidden />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            No active or upcoming challenges
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 280 }}>
            {canManage ? "Open one to make a kind of win worth more for a few weeks." : "Your manager can open one to make a kind of win worth more for a while."}
          </Typography>
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
          {visible.map((c) => (
            <ChallengeCard key={c.id} c={c} today={today} canManage={canManage} pending={pending} onRemove={() => setConfirmRemove(c)} />
          ))}
        </Box>
      )}

      {canManage && <CreateChallengeDrawer open={open} onClose={() => setOpen(false)} viewerProvinces={viewerProvinces} today={today} />}

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={`Remove "${confirmRemove?.title ?? ""}"?`}
        description="Points already awarded under this challenge are kept. This is recorded in the audit log."
        confirmLabel="Remove challenge"
        destructive
        onConfirm={() => {
          const c = confirmRemove;
          setConfirmRemove(null);
          if (!c) return;
          start(async () => {
            const r = await removeChallengeAction(c.id);
            toast.result(r);
            if (r.ok) router.refresh();
          });
        }}
      />
    </Card>
  );
}
