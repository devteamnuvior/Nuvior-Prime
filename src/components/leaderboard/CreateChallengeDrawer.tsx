"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormHelperText from "@mui/material/FormHelperText";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { createChallengeAction } from "@/app/actions";
import { POINT_REASONS, POINT_RULES, type PointReasonCode } from "@/domain/performance/xp";
import { addDays } from "@/domain/performance/targets";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { SideDrawer } from "@/components/feedback/SideDrawer";
import { CodeChip } from "@/components/feedback/StatusChip";
import { toast } from "@/components/feedback/toast";
import { MultiplierBadge } from "./MultiplierBadge";
import { formatDayRange, windowDays } from "./challengeFormat";

const MULTIPLIERS = [1.5, 2, 3, 5] as const;
const FORM_ID = "create-challenge-form";

/**
 * Side panel for managers and admins to open a challenge: a window where one point reason is
 * worth a multiple. A live preview at the top shows the card the reps will see.
 */
export function CreateChallengeDrawer({ open, onClose, viewerProvinces, today }: { open: boolean; onClose: () => void; viewerProvinces: string[]; today: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const national = viewerProvinces.includes("*");
  const initialProvinces = React.useMemo(() => (national ? [] : viewerProvinces.slice(0, 1)), [national, viewerProvinces]);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reason, setReason] = React.useState<PointReasonCode>("ACADEMY_SIGNUP");
  const [multiplier, setMultiplier] = React.useState<number>(2);
  const [provinces, setProvinces] = React.useState<string[]>(initialProvinces);
  const [startsOn, setStartsOn] = React.useState(today);
  const [endsOn, setEndsOn] = React.useState(addDays(today, 29));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Every opening starts from a clean form.
  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setReason("ACADEMY_SIGNUP");
    setMultiplier(2);
    setProvinces(initialProvinces);
    setStartsOn(today);
    setEndsOn(addDays(today, 29));
    setErrors({});
  }, [open, today, initialProvinces]);

  const options = national ? CANADIAN_PROVINCES.map((p) => p.code) : viewerProvinces;
  const rule = POINT_RULES[reason];
  const days = windowDays(startsOn, endsOn);
  const boosted = Math.round(rule.points * multiplier);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    start(async () => {
      const r = await createChallengeAction({ title, description: description.trim() || null, reason, multiplier, provinceCodes: provinces, startsOn, endsOn });
      toast.result(r);
      if (r.ok) {
        onClose();
        router.refresh();
      } else if (r.fieldErrors) setErrors(r.fieldErrors);
    });
  };

  return (
    <SideDrawer
      open={open}
      onClose={pending ? () => undefined : onClose}
      title="New challenge"
      description="Pick one kind of win and make it worth more for a while. Challenges never reduce points."
      titleId="create-challenge-title"
      footer={
        <>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="contained" loading={pending} loadingPosition="start" disabled={!title.trim()}>
            {pending ? "Creating…" : "Create challenge"}
          </Button>
        </>
      }
    >
      <Box id={FORM_ID} component="form" onSubmit={submit} noValidate sx={{ display: "grid", gap: 5 }}>
        {/* Live preview of the card reps will see */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            gap: 3,
            p: 4,
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            background: "linear-gradient(135deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 70%)",
          }}
        >
          <MultiplierBadge multiplier={multiplier} active />
          <Box sx={{ minWidth: 0, display: "grid", gap: 0.75 }}>
            <Typography variant="body1" noWrap sx={{ fontWeight: 600, color: title.trim() ? "text.primary" : "text.disabled" }}>
              {title.trim() || "Untitled challenge"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {rule.label} · {rule.points} XP becomes{" "}
              <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                {boosted} XP
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {days > 0 ? `${formatDayRange(startsOn, endsOn)} · ${days} day${days === 1 ? "" : "s"}` : "Pick a start and an end date"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
              {provinces.length ? provinces.map((p) => <CodeChip key={p} label={p} />) : <CodeChip label="All provinces" />}
            </Box>
          </Box>
        </Box>

        <TextField
          label="Title"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={!!errors.title}
          helperText={errors.title ?? "What reps will see on the board, e.g. “Academy November”."}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: 300 } }}
        />

        <Box sx={{ display: "grid", gap: 2 }}>
          <TextField
            select
            label="Rewards"
            value={reason}
            onChange={(e) => setReason(e.target.value as PointReasonCode)}
            helperText={rule.description}
            slotProps={{ select: { renderValue: (v) => `${POINT_RULES[v as PointReasonCode].label} · ${POINT_RULES[v as PointReasonCode].points} XP` } }}
          >
            {POINT_REASONS.map((r) => (
              <MenuItem key={r} value={r} sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                <span>{POINT_RULES[r].label}</span>
                <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {POINT_RULES[r].points} XP
                </Typography>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="eyebrow" component="label" id="challenge-multiplier-label" sx={{ display: "block", color: "text.secondary" }}>
            Multiplier
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={multiplier}
            onChange={(_, v: number | null) => v != null && setMultiplier(v)}
            aria-labelledby="challenge-multiplier-label"
          >
            {MULTIPLIERS.map((m) => (
              <ToggleButton key={m} value={m} sx={{ textTransform: "none", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {m}×
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {errors.multiplier && <FormHelperText error>{errors.multiplier}</FormHelperText>}
        </Box>

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <TextField label="Starts on" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} error={!!errors.startsOn} helperText={errors.startsOn} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Ends on" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} error={!!errors.endsOn} helperText={errors.endsOn} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: startsOn } }} />
        </Box>

        <TextField
          select
          label={national ? "Provinces (empty = all)" : "Provinces"}
          value={provinces}
          onChange={(e) => setProvinces(typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as string[]))}
          error={!!errors.provinceCodes}
          helperText={errors.provinceCodes}
          slotProps={{ select: { multiple: true, renderValue: (v) => ((v as string[]).length ? (v as string[]).join(", ") : "All provinces") } }}
        >
          {options.map((p) => (
            <MenuItem key={p} value={p}>
              <Checkbox size="small" checked={provinces.includes(p)} />
              <ListItemText primary={CANADIAN_PROVINCES.find((x) => x.code === p)?.name ?? p} secondary={p} />
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </SideDrawer>
  );
}
