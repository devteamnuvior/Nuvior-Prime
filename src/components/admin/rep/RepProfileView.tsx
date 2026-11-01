"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import type { RepProfileDto } from "@/lib/repProfile";
import type { RangeKey } from "@/domain/performance/repMetrics";
import { TARGET_METRIC_LABELS, TARGET_PERIOD_LABELS } from "@/domain/performance/targets";
import { KpiCard, KpiGrid } from "@/components/feedback/KpiCard";
import { CodeChip, StatusChip } from "@/components/feedback/StatusChip";
import { PageHeader } from "@/components/layout/PageHeader";
import { TerritoryBadges } from "../ProvinceBadge";
import { UserAvatar } from "../UserAvatar";
import { ROLE_META, formatDate, formatRelative } from "../userPresentation";
import { BADGES, badgeDefinition } from "@/domain/performance/xp";
import { BadgeIcon } from "@/components/performance/BadgeIcon";
import { LevelBar } from "@/components/performance/LevelBar";
import { ActivityCalendar } from "./ActivityCalendar";
import { FunnelBars, ProductMixChart, VisitsTrendChart } from "./RepCharts";
import { AuditList, RecentRoutesTable, RecentVisitsTable } from "./RepTables";
import { TargetsEditor } from "./TargetsEditor";

const RANGE_LABELS: Record<RangeKey, string> = { "30": "30 days", "90": "90 days", "365": "12 months" };

function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card component="section" sx={{ px: 5, py: 4, display: "grid", gap: 4, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
        <Box>
          <Typography variant="h3" component="h2">
            {title}
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
              {hint}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Card>
  );
}

function pctText(v: number | null): string {
  return v == null ? "—" : `${v}%`;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warning" | "success" }) {
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="h2" component="span" sx={{ fontVariantNumeric: "tabular-nums", color: tone === "warning" ? "warning.main" : tone === "success" ? "success.main" : "text.primary" }}>
        {value}
      </Typography>
    </Box>
  );
}

export function RepProfileView({
  profile,
  canManageTargets,
  viewerId,
  renderedAt,
}: {
  profile: RepProfileDto;
  canManageTargets: boolean;
  viewerId: string;
  renderedAt: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, kpis, range } = profile;
  const status = user.status === "ACTIVE" ? { tone: "success" as const, label: "Active" } : { tone: "neutral" as const, label: "Disabled" };

  const setRange = (_: unknown, next: RangeKey | null) => {
    if (next) router.push(`${pathname}?range=${next}`);
  };

  return (
    <>
      <Button component={Link} href="/admin/users" size="small" variant="text" startIcon={<ArrowBackOutlined />} sx={{ mb: 3, ml: -1 }}>
        All team members
      </Button>

      <PageHeader
        eyebrow={ROLE_META[user.role].label}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
            <UserAvatar name={user.displayName} email={user.email} size="lg" status={user.status} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <span>{user.displayName}</span>
                {user.id === viewerId && <CodeChip label="You" />}
                <StatusChip tone={status.tone} label={status.label} />
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: "var(--mono)", fontWeight: 400 }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        }
        actions={
          <ToggleButtonGroup exclusive size="small" value={range.key} onChange={setRange} aria-label="Date range">
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
              <ToggleButton key={k} value={k} sx={{ px: 3, textTransform: "none" }}>
                {RANGE_LABELS[k]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 6, mb: 6, alignItems: "center" }}>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Territory
          </Typography>
          <TerritoryBadges codes={user.provinces} />
        </Box>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Last active
          </Typography>
          <Typography variant="body2">{formatRelative(user.lastLoginAt, renderedAt)}</Typography>
        </Box>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Member since
          </Typography>
          <Typography variant="body2">{formatDate(user.createdAt)}</Typography>
        </Box>
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Range
          </Typography>
          <Typography variant="body2">
            {range.start} → {range.end}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 6 }}>
        <KpiGrid>
          <KpiCard label="Target hit rate" value={pctText(kpis.targetHitRate)} hint={kpis.targetHitRate == null ? "Needs a daily visits target" : `Days the daily visits target was met · ${kpis.totals.activeDays} active days`} icon={FlagOutlined} tone={kpis.targetHitRate == null ? "neutral" : kpis.targetHitRate >= 70 ? "success" : "warning"} />
          <KpiCard label="Plan adherence" value={pctText(kpis.planAdherence)} hint={`${kpis.totals.visits} visits of ${kpis.totals.plannedStops} planned stops`} icon={RouteOutlined} tone="primary" />
          <KpiCard label="Visit → order" value={pctText(kpis.visitToOrder)} hint={`${kpis.totals.orders} orders where a decision maker was reached`} icon={ShoppingBagOutlined} tone="neutral" />
          <KpiCard label="Drive min / visit" value={kpis.driveMinutesPerVisit == null ? "—" : String(kpis.driveMinutesPerVisit)} hint="Planned driving spread over logged visits" icon={DirectionsCarOutlined} tone="neutral" />
        </KpiGrid>

        <Section title="Visits per week" hint="Logged visits against the weekly target (daily target × 5 working days unless a weekly target is set).">
          <VisitsTrendChart weekly={profile.weekly} />
        </Section>

        <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
          <Section title="Funnel" hint="Each step shows its conversion from the previous one.">
            <FunnelBars steps={profile.funnel} />
          </Section>
          <Section title="Lead product mix" hint="Recommended lead product across the stops on this rep's routes.">
            <ProductMixChart mix={profile.productMix} />
          </Section>
        </Box>

        <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" } }}>
          <Section title="Activity" hint="Logged visits per day. Darker means more visits.">
            <ActivityCalendar cells={profile.calendar} />
          </Section>
          <Section title="Quality" hint="How well the logged visits are documented and targeted.">
            <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <Stat label="Average fit score" value={profile.quality.avgFitScore ?? "—"} />
              <Stat label="Quality visit share" value={pctText(profile.quality.qualityShare)} />
              <Stat label="Visits with an outcome" value={pctText(profile.quality.outcomeCoverage)} />
              <Stat label="Overdue follow-ups" value={profile.quality.overdueFollowUps} tone={profile.quality.overdueFollowUps > 0 ? "warning" : "success"} />
            </Box>
            {profile.outcomes.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, pt: 3, borderTop: 1, borderColor: "divider" }}>
                {profile.outcomes.map((o) => (
                  <StatusChip key={o.code} dot={false} tone={o.tone === "danger" ? "danger" : o.tone === "warning" ? "warning" : o.tone === "success" ? "success" : o.tone === "primary" ? "primary" : "neutral"} label={`${o.label} · ${o.count}`} />
                ))}
              </Box>
            )}
          </Section>
        </Box>

        <Section title="XP and badges" hint="Every point is a ledger row tied to a visit, a day or a streak; totals are sums over that ledger.">
          <LevelBar level={profile.xp.level} totalXp={profile.xp.totalXp} />
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <Stat label="This week" value={profile.xp.weekPoints} />
            <Stat label="This month" value={profile.xp.monthPoints} />
            <Stat label="Badges" value={`${profile.xp.badges.length} / ${BADGES.length}`} />
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {BADGES.map((b) => {
              const earned = profile.xp.badges.find((x) => x.code === b.code);
              const next = profile.xp.nextBadges.find((n) => n.code === b.code);
              return <BadgeIcon key={b.code} badge={badgeDefinition(b.code) ?? b} earned={!!earned} hint={earned ? `Earned ${earned.earnedAt.slice(0, 10)}.` : next ? `(${next.value} / ${next.threshold})` : undefined} />;
            })}
          </Box>
          {profile.pointEvents.length > 0 && (
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, pt: 3, borderTop: 1, borderColor: "divider", display: "grid" }}>
              {profile.pointEvents.map((e) => (
                <Box component="li" key={e.id} sx={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr) auto", alignItems: "center", gap: 3, py: 1.25, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
                  <Typography variant="caption" sx={{ fontFamily: "var(--mono)", color: "text.secondary" }}>
                    {e.day}
                  </Typography>
                  <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Typography variant="body2" noWrap>
                      {e.label}
                    </Typography>
                    {e.multiplier !== 1 && <StatusChip dot={false} tone="success" label={`× ${e.multiplier}${e.challengeTitle ? ` · ${e.challengeTitle}` : ""}`} />}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    +{e.points}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Section>

        <Section title="Targets" hint={canManageTargets ? "Active targets drive the rep's progress bars. Changes are audited." : "Set by a manager or admin."}>
          {profile.progress.length > 0 && (
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
              {profile.progress.map((p) => (
                <Box key={`${p.period}-${p.metric}`} sx={{ p: 3, borderRadius: 1.5, bgcolor: "background.sunken", display: "grid", gap: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {TARGET_PERIOD_LABELS[p.period]} · {TARGET_METRIC_LABELS[p.metric]}
                  </Typography>
                  <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.actual} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>/ {p.target}</Box>
                  </Typography>
                  <StatusChip
                    dot={false}
                    uppercase
                    tone={p.status === "met" || p.status === "ahead" ? "success" : p.status === "behind" ? "warning" : "primary"}
                    label={p.status === "met" ? "Met" : p.status === "ahead" ? "Ahead" : p.status === "behind" ? "Behind" : "On track"}
                    sx={{ justifySelf: "start" }}
                  />
                </Box>
              ))}
            </Box>
          )}
          <TargetsEditor userId={user.id} targets={profile.targets} today={profile.today} canManage={canManageTargets} />
        </Section>

        <Section title="Recent visits" hint="Latest 25 visits this rep logged.">
          <RecentVisitsTable rows={profile.recentVisits} today={profile.today} />
        </Section>

        <Section title="Recent routes" hint="Latest 20 routes built on Today's Route.">
          <RecentRoutesTable rows={profile.recentRoutes} />
        </Section>

        <Section title="History" hint="Audit events by or about this user, newest first.">
          <AuditList rows={profile.audit} />
        </Section>
      </Box>
    </>
  );
}
