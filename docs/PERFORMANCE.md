# Rep performance — phases 1 to 4

**Status:** Phase 1 complete (structured outcomes, targets, daily summaries) · Phase 2 complete (admin per-rep page) · Phase 3 complete (rep "My day" panel) · Phase 4 (XP, levels, badges, leaderboard) removed 2026-11-05 · Phase 5 complete (clinic slots; challenges and the MANAGER role removed 2026-11-05)  
**Next:** Phase 5 Odoo orders (deferred until Odoo access exists)

## Competition layer removed (2026-11-05)

XP, levels (Associate … Master), badges and the `/leaderboard` page were removed
end to end: `src/domain/performance/xp.ts`, `src/lib/xp.ts`, the
`PointEvent` / `UserBadge` tables and the `PointReason` enum
(`prisma/releases/2026-11-05_xp_removed.sql`), the `xp:backfill` script and the
XP column on the admin users list. Streaks stay (they are computed from
`RepDailySummary`, not from points). What a rep sees is counts only: clinics
today, visits this month, follow-ups, new accounts and Academy sign-ups.

## Phase 3 — rep "My day" panel

Shown at the top of the planner panel on Today's Route (`/`) for anyone with
`performance.view.own`, until a route is built or the plan is being edited.
Collapsible; the collapsed state is remembered per browser.

| Block | Source | Notes |
| --- | --- | --- |
| Message | `buildDayMessage` | Deterministic "if you reach it" copy: remaining visits, streak at risk, month pace, follow-ups due. Weekend and no-target fallbacks. Tone: encouraging, never absolute. |
| Daily target bars | `getTargetProgress` | One bar per DAY target. |
| Last 14 days | `RepDailySummary` | Visits per day, today highlighted, weekends outlined. |
| Month so far | `RepDailySummary` | Visits vs last month to the same day, average fit vs team (reps in the same provinces, aggregate only), WEEK/MONTH targets with pace. |
| Follow-ups | `VisitRecord` | Overdue or due-today count, link to Visit history. |

Streak = consecutive working days (Mon–Fri) on which the DAY/VISITS target was
met, ending today (once met) or yesterday; weekends neither count nor break it.
`computeStreak` and `buildDayMessage` are tested in
`src/domain/performance/motivation.test.ts`. The loader is
`src/lib/repDashboard.ts`; saving a visit refreshes the panel
(`revalidatePath("/")` + `router.refresh()`) without touching the planned route.

## Phase 2 — admin per-rep page

`/admin/users/[id]` (linked from the Users table name, its row menu "View
performance", and the rep name on Team Activity). Gated by
`performance.view.team`; province-scoped admins only reach reps who share one of their
provinces, admins reach everyone. Range switch `?range=30|90|365` (default 90).

| Section | Source | Notes |
| --- | --- | --- |
| KPI row | `computeRepKpis` over `RepDailySummary` | Target hit rate (days with a DAY/VISITS target where it was met), plan adherence (visits / planned stops), visit → order (orders / visits where a decision maker was reached), drive min / visit. Each is `—` when its denominator is zero. |
| Visits per week | `weeklySeries` | Monday weeks; target line = WEEK/VISITS target, else DAY/VISITS × 5. |
| Funnel | `funnel` | Planned stops → visited → decision maker reached → interested or better → orders, with step-to-step conversion. |
| Lead product mix | `productMix` over `VisitListItem` of the rep's runs | Share of planned stops by recommended lead product. |
| Activity | `activityCalendar` | GitHub-style grid, one cell per day. |
| Quality | `qualityStats` | Avg fit, outcome coverage, overdue follow-ups (follow-up date passed with no later visit to that account). |
| Targets | `TargetsEditor` | Progress cards for active targets; list with Active / Superseded / Upcoming / Ended; set and remove form for `target.manage`. |
| Recent visits / routes / history | Prisma | Latest 25 visits, 20 routes, 30 audit events by or about the user (including `target.*` events whose metadata names them). |

Charts use `@mui/x-charts` (same major as the data grid). Metrics are pure and
tested in `src/domain/performance/repMetrics.test.ts`; the loader is
`src/lib/repProfile.ts`.

---

## Why

Rep dashboards, targets and a competitive layer all need numbers that can be
summed. Before this phase a visit's outcome was free text and no target existed
anywhere in the database. This phase adds the data without changing any
qualification, DNC, CRM or routing rule.

## What changed

| Area | Change |
| --- | --- |
| `VisitRecord` | `outcomeCode VisitOutcome?` (structured) and `durationMinutes Int` (45, 90, 135 or 180). `outcome` stays as the free-text note. |
| `SalesTarget` | Per-rep target: `period` (DAY / WEEK / MONTH), `metric`, `value`, `startsOn`, optional `endsOn`. Unique on (user, period, metric, startsOn). |
| `RepDailySummary` | One row per rep per calendar day: visits, clinic slots (`visitSlots`), new accounts, follow-ups, academy sign-ups, orders, outcome counts, planned stops / drive minutes. Recomputed after every visit save. |
| Permissions | `performance.view.own` (all roles), `performance.view.team` and `target.manage` (ADMIN). |
| Visit form | Outcome is a required select; the free-text field became "Outcome note". AI note structuring suggests a code via `inferVisitOutcomeCode` (never overrides a rep's choice). |
| Visit History | Outcome chips, fit column, and a target strip for the signed-in rep. |
| Seed | Default targets for seed reps (10 clinic slots/day, 5 follow-ups/week, 4 new accounts/month, 2 academy sign-ups/month). |

## Outcome codes

| Code | Label | Contact made |
| --- | --- | --- |
| `INTERESTED` | Interested, follow-up agreed | yes |
| `MET_DECISION_MAKER` | Met decision maker | yes |
| `SAMPLE_LEFT` | Sample left | yes |
| `QUOTE_REQUESTED` | Quote requested | yes |
| `ORDER_PLACED` | Order placed | yes |
| `ACADEMY_SIGNUP` | Academy / certification sign-up | yes |
| `NOT_AVAILABLE` | Decision maker not available | no |
| `NOT_INTERESTED` | Not interested | yes |
| `CLOSED_OR_MOVED` | Closed or moved | no |

A **new account** is a visit to an account with no
earlier `VisitRecord` by anyone. A **follow-up** is a visit of type
`re-visit` or `follow-up on a quote`.

## Target resolution

The active target for a day is the row with the latest `startsOn` on or before
that day whose `endsOn` is null or on/after it. Weeks run Monday–Sunday. Progress
reports `actual`, `remaining`, `percent`, an even-pace `expectedByNow` and a
linear `forecast`; status is `met` / `ahead` / `on_track` / `behind`.

Province-scoped admins can set targets only for reps who share one of their provinces; national admins
anywhere (`setSalesTargetAction`, `removeSalesTargetAction`, audited as
`target.set` / `target.remove`). Editing UI lands with the admin per-rep page
in phase 2.

## Code map

| Path | Role |
| --- | --- |
| `src/domain/performance/visitOutcome.ts` | Codes, labels, free-text inference |
| `src/domain/performance/targets.ts` | Period ranges, active target, progress maths |
| `src/domain/performance/dailySummary.ts` | Pure summary builder and metric readers |
| `src/lib/performance.ts` | Prisma: recompute summary, target CRUD, progress per rep |
| `src/components/visits/TargetProgressStrip.tsx` | Target cards on Visit History |

## Validation

```bash
npx vitest run src/domain/performance src/domain/auth
npm run typecheck && npm run lint
```

Dates are stored at UTC midnight and compared as `YYYY-MM-DD` keys, matching
how the visit form submits `visitDate`.

## Not in this phase

- Revenue and order values (needs Odoo order import, phase 5).
- Backfill of `outcomeCode` for visits logged before this phase: they keep the
  free-text `outcome` and show it as-is in Visit History.

## Phase 5 — clinic slots (2026-11-05)

A rep's day is **ten clinics of 45 minutes**. The daily `VISITS` target is measured in
clinic slots (`src/domain/performance/visitSlots.ts`): a standard visit is one slot, and a
visit the rep records as **Extended · 90 min** counts as two, so a long demo or training
does not cost the rep their day. The rep picks the duration on the visit form
("Time at clinic"); `VisitRecord.durationMinutes` stores it and
`RepDailySummary.visitSlots` sums it per day. `metricValue("VISITS")` reads `visitSlots`,
so target progress, streaks and the admin KPIs all count slots.
Raw `visits` stays for display.

Every rep has the ten-slot DAY/VISITS target by default
(`DEFAULT_DAILY_VISITS_TARGET`, via `resolveDailyVisitsTarget`); an admin-set
`SalesTarget` for the same period and metric overrides it. Route planning defaults to ten
stops of 45 minutes (`ROUTING_DEFAULT_VISIT_MINUTES`).

Removed in the same release: challenges (the `Challenge` table and the
`PointEvent.multiplier` / `challengeId` columns; points are now always the base points) and
the MANAGER role (existing managers became ADMIN). Release SQL:
`prisma/releases/2026-11-05_clinic_slots.sql`, applied by `scripts/predeploy.ts`.

## Fit score removed (2026-11-05)

The 1–5 account fit score is gone end to end: `scoreFit` and
`QualificationResult.fitScore`, the planner's minimum-fit filter and fit weight in
route utility, `VisitRecord.fitScoreSnapshot`, `VisitListItem.fitScore`,
`VisitListRun.minFitScore`, `AccountQualification.fitScore`,
`RepDailySummary.avgFitScore`, the "Average fit" tiles and the fit chips. Routing
ranks by revisit, travel time and schedule; the Visit History tile shows clinic
slots instead. Release SQL: `prisma/releases/2026-11-05_fit_removed.sql`.
