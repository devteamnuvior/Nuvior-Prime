"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import type { ChallengeRow, LeaderboardPeriod, UserXp } from "@/lib/xp";
import { BADGES, badgeDefinition, levelFor, type RankedEntry } from "@/domain/performance/xp";
import { PageHeader } from "@/components/layout/PageHeader";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { EmptyState } from "@/components/feedback/EmptyState";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { BadgeIcon } from "@/components/performance/BadgeIcon";
import { LevelBar } from "@/components/performance/LevelBar";
import { ChallengesPanel } from "./ChallengesPanel";

const nf = new Intl.NumberFormat("en-CA");
const rangeFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

function Medal({ rank }: { rank: number }) {
  const tone = rank === 1 ? { bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.18)", fg: "warning.main" } : rank === 2 ? { bg: "background.sunken", fg: "text.secondary" } : rank === 3 ? { bg: "rgba(var(--nv-palette-error-mainChannel) / 0.1)", fg: "error.main" } : null;
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.8125rem",
        fontVariantNumeric: "tabular-nums",
        bgcolor: tone?.bg ?? "transparent",
        color: tone?.fg ?? "text.secondary",
        border: tone ? 0 : 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      {rank}
    </Box>
  );
}

export function LeaderboardView({
  period,
  provinceCode,
  provinceOptions,
  range,
  rows,
  me,
  toFirst,
  trimmed,
  totalRanked,
  myXp,
  viewerId,
  viewerProvinces,
  challenges,
  canManage,
  today,
}: {
  period: LeaderboardPeriod;
  provinceCode: string;
  provinceOptions: { code: string; name: string }[];
  range: { start: string; end: string };
  rows: RankedEntry[];
  me: RankedEntry | null;
  toFirst: number;
  trimmed: boolean;
  totalRanked: number;
  myXp: UserXp;
  viewerId: string;
  viewerProvinces: string[];
  challenges: ChallengeRow[];
  canManage: boolean;
  today: string;
}) {
  const router = useRouter();
  const go = (next: { period?: LeaderboardPeriod; province?: string }) => {
    const p = new URLSearchParams();
    p.set("period", (next.period ?? period) === "MONTH" ? "month" : "week");
    p.set("province", next.province ?? provinceCode);
    router.push(`/leaderboard?${p.toString()}`);
  };

  const periodLabel = period === "WEEK" ? "this week" : "this month";

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description={`XP earned ${periodLabel} · ${rangeFmt.format(new Date(`${range.start}T00:00:00.000Z`))} – ${rangeFmt.format(new Date(`${range.end}T00:00:00.000Z`))}. Points reward quality visits, follow-through and strategic outcomes, never raw volume.`}
        actions={
          <>
            {provinceOptions.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select value={provinceCode} onChange={(e) => go({ province: String(e.target.value) })} inputProps={{ "aria-label": "Province" }}>
                  {provinceOptions.map((p) => (
                    <MenuItem key={p.code} value={p.code}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <ToggleButtonGroup exclusive size="small" value={period} onChange={(_, v: LeaderboardPeriod | null) => v && go({ period: v })} aria-label="Period">
              <ToggleButton value="WEEK" sx={{ px: 3, textTransform: "none" }}>
                Week
              </ToggleButton>
              <ToggleButton value="MONTH" sx={{ px: 3, textTransform: "none" }}>
                Month
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        }
      />

      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box sx={{ display: "grid", gap: 6 }}>
          <Card sx={{ overflow: "hidden" }}>
            {rows.length === 0 ? (
              <EmptyState illustration="inbox" title="No one on the board yet" description="XP appears here as reps log visits with outcomes." />
            ) : (
              <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {rows.map((r, i) => {
                  const isMe = r.userId === viewerId;
                  const level = levelFor(r.totalXp);
                  const gap = i > 0 && rows[i - 1].rank < r.rank - 1;
                  return (
                    <React.Fragment key={r.userId}>
                      {gap && (
                        <Box component="li" aria-hidden sx={{ px: 5, py: 1, color: "text.disabled", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
                          ···
                        </Box>
                      )}
                      <Box
                        component="li"
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "32px minmax(0, 1fr) auto", sm: "32px minmax(0, 1fr) 90px 90px auto" },
                          alignItems: "center",
                          gap: 3,
                          px: 5,
                          py: 3,
                          borderBottom: 1,
                          borderColor: "divider",
                          bgcolor: isMe ? "action.selected" : "transparent",
                          "&:last-of-type": { borderBottom: 0 },
                        }}
                      >
                        <Medal rank={r.rank} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                          <UserAvatar name={r.displayName} email={r.userId} size="sm" />
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                {r.displayName}
                              </Typography>
                              {isMe && <CodeChip label="You" />}
                              {r.provinceCode && provinceCode === "*" && <CodeChip label={r.provinceCode} />}
                            </Box>
                            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                              Level {level.index + 1} · {level.name} · {nf.format(r.totalXp)} XP total
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                          {r.visits} visits
                        </Typography>
                        <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                          {r.qualityVisits} quality
                        </Typography>
                        <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                          {nf.format(r.points)}
                          <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
                            XP
                          </Typography>
                        </Typography>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>
            )}
            {trimmed && (
              <Typography variant="caption" sx={{ display: "block", px: 5, py: 2.5, color: "text.secondary", bgcolor: "background.default" }}>
                Showing the top 3 and the reps around you · {totalRanked} on the board.
              </Typography>
            )}
          </Card>

          <Card sx={{ px: 5, py: 4, display: "grid", gap: 3 }}>
            <Typography variant="h3" component="h2">
              How XP works
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 4, display: "grid", gap: 1, color: "text.secondary", fontSize: "0.8125rem" }}>
              <li>Quality visit (fit 4–5) 20 XP · other visit 8 XP · one per clinic per day.</li>
              <li>Outcome logged the same day +5 · follow-up on time +10.</li>
              <li>Academy sign-up 40 XP · first order from an account you opened 60 XP.</li>
              <li>Daily target met +15 · streak milestones (5, 10, 20, 50 days) +25.</li>
              <li>Active challenges multiply one reason for a while; they never reduce points.</li>
            </Box>
          </Card>
        </Box>

        <Box sx={{ display: "grid", gap: 6 }}>
          <Card sx={{ px: 5, py: 4, display: "grid", gap: 4 }}>
            <Typography variant="h3" component="h2">
              Your standing
            </Typography>
            <LevelBar level={myXp.level} totalXp={myXp.totalXp} />
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {period === "WEEK" ? "This week" : "This month"}
                </Typography>
                <Typography variant="h2" component="div" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {nf.format(period === "WEEK" ? myXp.weekPoints : myXp.monthPoints)} <Typography component="span" variant="caption">XP</Typography>
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Rank
                </Typography>
                <Typography variant="h2" component="div" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {me ? `#${me.rank}` : "—"}
                  {me && (
                    <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                      {toFirst > 0 ? `${nf.format(toFirst)} to first` : totalRanked > 1 ? "leading" : ""}
                    </Typography>
                  )}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ pt: 3, borderTop: 1, borderColor: "divider", display: "grid", gap: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Badges · {myXp.badges.length} of {BADGES.length}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {BADGES.map((b) => {
                  const earned = myXp.badges.some((x) => x.code === b.code);
                  const next = myXp.nextBadges.find((n) => n.code === b.code);
                  return <BadgeIcon key={b.code} badge={badgeDefinition(b.code) ?? b} earned={earned} hint={next ? `(${next.value} / ${next.threshold})` : undefined} />;
                })}
              </Box>
            </Box>
            <Typography component={Link} href="/visits" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
              Visit history →
            </Typography>
          </Card>

          <ChallengesPanel challenges={challenges} canManage={canManage} viewerProvinces={viewerProvinces} today={today} />
        </Box>
      </Box>
      {!me && !trimmed && rows.length > 0 && (
        <Typography variant="caption" sx={{ display: "block", mt: 3, color: "text.secondary" }}>
          <StatusChip dot={false} tone="neutral" label="Managers and admins are not ranked" sx={{ mr: 1 }} />
          The board lists active representatives only.
        </Typography>
      )}
    </>
  );
}
