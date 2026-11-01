"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import { createChallengeAction, removeChallengeAction } from "@/app/actions";
import type { ChallengeRow } from "@/lib/xp";
import { POINT_REASONS, POINT_RULES, type PointReasonCode } from "@/domain/performance/xp";
import { addDays } from "@/domain/performance/targets";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Disclosure } from "@/components/feedback/Disclosure";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { toast } from "@/components/feedback/toast";

const STATE: Record<ChallengeRow["state"], { label: string; tone: "success" | "info" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  upcoming: { label: "Upcoming", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
};

export function ChallengesPanel({ challenges, canManage, viewerProvinces, today }: { challenges: ChallengeRow[]; canManage: boolean; viewerProvinces: string[]; today: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reason, setReason] = React.useState<PointReasonCode>("ACADEMY_SIGNUP");
  const [multiplier, setMultiplier] = React.useState("2");
  const [provinces, setProvinces] = React.useState<string[]>(viewerProvinces.includes("*") ? [] : viewerProvinces.slice(0, 1));
  const [startsOn, setStartsOn] = React.useState(today);
  const [endsOn, setEndsOn] = React.useState(addDays(today, 29));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = React.useState<ChallengeRow | null>(null);

  const options = viewerProvinces.includes("*") ? CANADIAN_PROVINCES.map((p) => p.code) : viewerProvinces;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    start(async () => {
      const r = await createChallengeAction({ title, description: description || null, reason, multiplier: Number(multiplier), provinceCodes: provinces, startsOn, endsOn });
      toast.result(r);
      if (r.ok) {
        setTitle("");
        setDescription("");
        router.refresh();
      } else if (r.fieldErrors) setErrors(r.fieldErrors);
    });
  };

  const visible = challenges.filter((c) => c.state !== "ended");

  return (
    <Card sx={{ px: 5, py: 4, display: "grid", gap: 4 }}>
      <Box>
        <Typography variant="h3" component="h2">
          Challenges
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
          A window where one kind of win is worth more. Managers set them for their provinces.
        </Typography>
      </Box>

      {visible.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No active or upcoming challenges.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
          {visible.map((c) => {
            const s = STATE[c.state];
            return (
              <Box component="li" key={c.id} sx={{ display: "flex", alignItems: "flex-start", gap: 3, px: 3, py: 2.5, borderRadius: 1.5, bgcolor: c.state === "active" ? "rgba(var(--nv-palette-success-mainChannel) / 0.08)" : "background.sunken" }}>
                <Box sx={{ minWidth: 0, flex: 1, display: "grid", gap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.title}
                    </Typography>
                    <StatusChip dot={false} uppercase tone={s.tone} label={s.label} />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {POINT_RULES[c.reason].label} × {c.multiplier} · {c.startsOn} to {c.endsOn}
                    {c.createdByName ? ` · by ${c.createdByName}` : ""}
                  </Typography>
                  {c.description && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {c.description}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {c.provinceCodes.length ? c.provinceCodes.map((p) => <CodeChip key={p} label={p} />) : <CodeChip label="All provinces" />}
                  </Box>
                </Box>
                {canManage && (
                  <Tooltip title="Remove challenge">
                    <span>
                      <IconButton size="small" aria-label={`Remove ${c.title}`} disabled={pending} onClick={() => setConfirmRemove(c)}>
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {canManage && (
        <Disclosure label="New challenge" variant="row" color="primary.main" sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Box component="form" onSubmit={submit} sx={{ display: "grid", gap: 3, pt: 2 }}>
            <TextField size="small" label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={!!errors.title} helperText={errors.title} slotProps={{ htmlInput: { maxLength: 80 } }} />
            <TextField size="small" label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <TextField select size="small" label="Rewards" value={reason} onChange={(e) => setReason(e.target.value as PointReasonCode)}>
                {POINT_REASONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {POINT_RULES[r].label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField size="small" label="Multiplier" type="number" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} error={!!errors.multiplier} helperText={errors.multiplier} slotProps={{ htmlInput: { min: 1, max: 5, step: 0.5 } }} />
              <TextField size="small" label="Starts on" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} error={!!errors.startsOn} helperText={errors.startsOn} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" label="Ends on" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} error={!!errors.endsOn} helperText={errors.endsOn} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <TextField
              select
              size="small"
              label={viewerProvinces.includes("*") ? "Provinces (empty = all)" : "Provinces"}
              value={provinces}
              onChange={(e) => setProvinces(typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as string[]))}
              error={!!errors.provinceCodes}
              helperText={errors.provinceCodes}
              slotProps={{ select: { multiple: true, renderValue: (v) => ((v as string[]).length ? (v as string[]).join(", ") : "All provinces") } }}
            >
              {options.map((p) => (
                <MenuItem key={p} value={p}>
                  <Checkbox size="small" checked={provinces.includes(p)} />
                  <ListItemText primary={p} />
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" variant="contained" loading={pending} disabled={!title.trim()}>
                Create challenge
              </Button>
            </Box>
          </Box>
        </Disclosure>
      )}

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
