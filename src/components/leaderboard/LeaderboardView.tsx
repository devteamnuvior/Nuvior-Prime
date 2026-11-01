"use client";

import * as React from "react";
import Link from "next/link";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import { useRouter } from "next/navigation";
import type { ChallengeRow, LeaderboardPeriod, UserXp } from "@/lib/xp";
import { BADGES, POINT_REASONS, POINT_RULES, badgeDefinition, levelFor, type RankedEntry } from "@/domain/performance/xp";
import { EASE } from "@/theme/tokens";
import { PageHeader } from "@/components/layout/PageHeader";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { EmptyState } from "@/components/feedback/EmptyState";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { BadgeIcon } from "@/components/performance/BadgeIcon";
import { LevelBar } from "@/components/performance/LevelBar";
import { ChallengesPanel } from "./ChallengesPanel";

const nf = new Intl.NumberFormat("en-CA");
const rangeFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

const REDUCED = "@media (prefers-reduced-motion: reduce)";

/* Rows and podium places rise into place one after another on first paint. */
const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;
/* The XP bars grow from the left once their row has landed. */
const grow = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const MEDAL: Record<number, { bg: string; fg: string; ring: string }> = {
  1: { bg: "linear-gradient(135deg, #f3d27a, #d9a24e 60%, #b07a1f)", fg: "#3a2a08", ring: "rgba(var(--nv-palette-warning-mainChannel) / 0.35)" },
  2: { bg: "linear-gradient(135deg, #eceeee, #c9cfcf 60%, #9aa1a0)", fg: "#2c3332", ring: "rgba(22, 28, 27, 0.14)" },
  3: { bg: "linear-gradient(135deg, #e9c3b0, #cf9478 60%, #a8674a)", fg: "#3b1f12", ring: "rgba(var(--nv-palette-error-mainChannel) / 0.22)" },
};

function Medal({ rank, size = 32 }: { rank: number; size?: number }) {
  const m = MEDAL[rank];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
        color: m ? m.fg : "text.secondary",
        background: m ? m.bg : "transparent",
        border: m ? 0 : 1,
        borderColor: "divider",
        boxShadow: m ? `0 0 0 4px ${m.ring}` : "none",
      }}
    >
      {rank}
    </Box>
  );
}

function PodiumPlace({ entry, place, isMe, showProvince, delay }: { entry: RankedEntry; place: 1 | 2 | 3; isMe: boolean; showProvince: boolean; delay: number }) {
  const height = place === 1 ? 84 : place === 2 ? 60 : 44;
  const m = MEDAL[place]!;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 2,
        minWidth: 0,
        animation: `${rise} 420ms ${EASE} both`,
        animationDelay: `${delay}ms`,
        [REDUCED]: { animation: "none" },
      }}
    >
      {place === 1 && <EmojiEventsRounded aria-hidden sx={{ fontSize: 22, color: "#d9a24e", mb: -1 }} />}
      <Box sx={{ position: "relative" }}>
        <Box sx={{ borderRadius: "50%", p: "3px", background: m.bg, boxShadow: `0 8px 20px -8px ${m.ring}` }}>
          <Box sx={{ borderRadius: "50%", border: "2px solid", borderColor: "background.paper", display: "flex" }}>
            <UserAvatar name={entry.displayName} email={entry.userId} size={place === 1 ? "lg" : "md"} />
          </Box>
        </Box>
        <Box sx={{ position: "absolute", right: -6, bottom: -4 }}>
          <Medal rank={place} size={24} />
        </Box>
      </Box>
      <Box sx={{ textAlign: "center", minWidth: 0, width: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {entry.displayName}
          </Typography>
          {isMe && <CodeChip label="You" />}
        </Box>
        <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
          {entry.qualityVisits} quality · {entry.visits} visits{showProvince && entry.provinceCode ? ` · ${entry.provinceCode}` : ""}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 1,
          height,
          borderRadius: "10px 10px 0 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          pt: 2,
          background: place === 1 ? "linear-gradient(180deg, rgba(var(--nv-palette-primary-mainChannel) / 0.22), rgba(var(--nv-palette-primary-mainChannel) / 0.06))" : "linear-gradient(180deg, rgba(22, 28, 27, 0.08), rgba(22, 28, 27, 0.02))",
          borderTop: 2,
          borderColor: place === 1 ? "primary.main" : "divider",
        }}
      >
        <Typography variant={place === 1 ? "h2" : "h3"} component="span" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {nf.format(entry.points)}
          <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
            XP
          </Typography>
        </Typography>
      </Box>
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
  const leaderPoints = rows[0]?.points ?? 0;
  // The podium only makes sense once someone has scored and the top three are distinct places.
  const top = rows.slice(0, 3);
  const podium = leaderPoints > 0 && top.length >= 2 && top.every((r, i) => r.rank === i + 1) ? top : null;
  const showProvince = provinceCode === "*";
  const myPoints = period === "WEEK" ? myXp.weekPoints : myXp.monthPoints;

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

      {/* Both columns stretch to the taller one and their last card fills the rest, so "How XP works" and "Challenges" always end on the same line. */}
      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" }, alignItems: "stretch" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          {podium && (
            <Card
              sx={{
                px: { xs: 4, sm: 8 },
                pt: 6,
                pb: 0,
                overflow: "hidden",
                background: "linear-gradient(180deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 60%)",
              }}
            >
              <Typography variant="eyebrow" sx={{ display: "block", color: "text.secondary", mb: 4, textAlign: "center" }}>
                Top of the board · {periodLabel}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", alignItems: "end", gap: { xs: 2, sm: 4 } }}>
                {[podium[1], podium[0], podium[2]].map((entry, col) => {
                  if (!entry) return <Box key={`empty-${col}`} />;
                  const place = (col === 1 ? 1 : col === 0 ? 2 : 3) as 1 | 2 | 3;
                  return <PodiumPlace key={entry.userId} entry={entry} place={place} isMe={entry.userId === viewerId} showProvince={showProvince} delay={place === 1 ? 0 : place === 2 ? 90 : 160} />;
                })}
              </Box>
            </Card>
          )}

          <Card sx={{ overflow: "hidden" }}>
            {rows.length === 0 ? (
              <EmptyState illustration="inbox" title="No one on the board yet" description="XP appears here as reps log visits with outcomes." />
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "36px minmax(0, 1fr) auto", sm: "36px minmax(0, 1fr) 80px 80px 96px" },
                    gap: 3,
                    px: 5,
                    py: 2.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  {["#", "Rep", "Visits", "Quality", "XP"].map((h, i) => (
                    <Typography key={h} variant="eyebrow" sx={{ color: "text.faint", textAlign: i >= 2 ? "right" : "left", display: i === 2 || i === 3 ? { xs: "none", sm: "block" } : "block" }}>
                      {h}
                    </Typography>
                  ))}
                </Box>
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {rows.map((r, i) => {
                    const isMe = r.userId === viewerId;
                    const level = levelFor(r.totalXp);
                    const gap = i > 0 && rows[i - 1].rank < r.rank - 1;
                    const share = leaderPoints > 0 ? r.points / leaderPoints : 0;
                    return (
                      <React.Fragment key={r.userId}>
                        {gap && (
                          <Box component="li" aria-hidden sx={{ px: 5, py: 1, color: "text.disabled", fontSize: "0.75rem", letterSpacing: "0.2em", textAlign: "center" }}>
                            ···
                          </Box>
                        )}
                        <Box
                          component="li"
                          sx={{
                            position: "relative",
                            display: "grid",
                            gridTemplateColumns: { xs: "36px minmax(0, 1fr) auto", sm: "36px minmax(0, 1fr) 80px 80px 96px" },
                            alignItems: "center",
                            gap: 3,
                            px: 5,
                            py: 3,
                            borderBottom: 1,
                            borderColor: "divider",
                            bgcolor: isMe ? "action.selected" : "transparent",
                            transition: (t) => t.transitions.create("background-color", { duration: t.transitions.duration.short }),
                            "&:hover": { bgcolor: isMe ? "action.selected" : "action.hover" },
                            "&:last-of-type": { borderBottom: 0 },
                            animation: `${rise} 360ms ${EASE} both`,
                            animationDelay: `${Math.min(i, 10) * 45}ms`,
                            [REDUCED]: { animation: "none" },
                            ...(isMe && { "&::before": { content: '""', position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: "0 3px 3px 0", bgcolor: "primary.main" } }),
                          }}
                        >
                          <Medal rank={r.rank} />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                            <UserAvatar name={r.displayName} email={r.userId} size="sm" />
                            <Box sx={{ minWidth: 0, flex: 1, display: "grid", gap: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                  {r.displayName}
                                </Typography>
                                {isMe && <CodeChip label="You" />}
                                {r.provinceCode && showProvince && <CodeChip label={r.provinceCode} />}
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                                {/* Share of the leader's points, so the spread is visible at a glance. */}
                                <Box aria-hidden sx={{ flex: 1, maxWidth: 160, height: 4, borderRadius: 2, bgcolor: "background.sunken", overflow: "hidden" }}>
                                  <Box
                                    sx={{
                                      height: 1,
                                      width: `${Math.round(share * 100)}%`,
                                      borderRadius: 2,
                                      bgcolor: isMe ? "primary.main" : r.rank <= 3 ? "primary.light" : "text.disabled",
                                      transformOrigin: "left center",
                                      animation: `${grow} 600ms ${EASE} both`,
                                      animationDelay: `${Math.min(i, 10) * 45 + 200}ms`,
                                      [REDUCED]: { animation: "none" },
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
                                  Level {level.index + 1} · {level.name}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                            {r.visits}
                          </Typography>
                          <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                            {r.qualityVisits}
                          </Typography>
                          <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }}>
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
              </>
            )}
            {trimmed && (
              <Typography variant="caption" sx={{ display: "block", px: 5, py: 2.5, color: "text.secondary", bgcolor: "background.default" }}>
                Showing the top 3 and the reps around you · {totalRanked} on the board.
              </Typography>
            )}
          </Card>

          <Card sx={{ p: 5, display: "grid", gap: 4, alignContent: "start", flex: 1 }}>
            <Box>
              <Typography variant="h3" component="h2">
                How XP works
              </Typography>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                One award per clinic per day for visits. Active challenges multiply one reason for a while; they never reduce points.
              </Typography>
            </Box>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
              {POINT_REASONS.map((code) => {
                const rule = POINT_RULES[code];
                return (
                  <Box component="li" key={code} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, px: 3, py: 2, borderRadius: 2, bgcolor: "background.default" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                        {rule.label}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                        {rule.description}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      +{rule.points} XP
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Card sx={{ overflow: "hidden", display: "grid", flexShrink: 0 }}>
            <Box sx={{ px: 5, pt: 5, pb: 4, background: "linear-gradient(180deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 100%)" }}>
              <Typography variant="h3" component="h2">
                Your standing
              </Typography>
              <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", mt: 4 }}>
                <Box>
                  <Typography variant="eyebrow" sx={{ display: "block", color: "text.secondary" }}>
                    {period === "WEEK" ? "This week" : "This month"}
                  </Typography>
                  <Typography variant="h1" component="div" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1, mt: 1 }}>
                    {nf.format(myPoints)}
                    <Typography component="span" variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
                      XP
                    </Typography>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="eyebrow" sx={{ display: "block", color: "text.secondary" }}>
                    Rank
                  </Typography>
                  <Typography variant="h1" component="div" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1, mt: 1 }}>
                    {me ? `#${me.rank}` : "—"}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                    {me ? (toFirst > 0 ? `${nf.format(toFirst)} XP to first` : totalRanked > 1 ? "Leading the board" : "Only you so far") : "Not ranked"}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ px: 5, py: 4, display: "grid", gap: 4 }}>
              <LevelBar level={myXp.level} totalXp={myXp.totalXp} />
              <Box sx={{ pt: 4, borderTop: 1, borderColor: "divider", display: "grid", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="eyebrow" sx={{ color: "text.secondary" }}>
                    Badges
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {myXp.badges.length} of {BADGES.length}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {BADGES.map((b) => {
                    const earned = myXp.badges.some((x) => x.code === b.code);
                    const next = myXp.nextBadges.find((n) => n.code === b.code);
                    return <BadgeIcon key={b.code} badge={badgeDefinition(b.code) ?? b} earned={earned} hint={next ? `(${next.value} / ${next.threshold})` : undefined} />;
                  })}
                </Box>
              </Box>
              <Typography
                component={Link}
                href="/visits"
                variant="body2"
                sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                Visit history <ArrowForwardRounded sx={{ fontSize: 16 }} aria-hidden />
              </Typography>
            </Box>
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
