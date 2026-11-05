# Rep performance — phases 1 to 4

**Status:** Phase 1 complete (structured outcomes, targets, daily summaries) · Phase 2 complete (admin per-rep page) · Phase 3 complete (rep "My day" panel) · Phase 4 complete (XP, levels, badges, leaderboard) · Phase 5 complete (clinic slots; challenges and the MANAGER role removed 2026-11-05)  
**Next:** Phase 5 Odoo orders (deferred until Odoo access exists)

## Phase 4 — competition layer

Rules are pure in `src/domain/performance/xp.ts` (tested in `xp.test.ts`);
persistence in `src/lib/xp.ts`; page at `/leaderboard` (nav item for everyone
with `performance.view.own`).

### XP ledger

`PointEvent` is append-only and unique per (user, reason, sourceType,
sourceId), so re-running the awarder never double-counts. Totals are sums over
the ledger. `npm run xp:backfill` awards points for visits logged before the
ledger existed (idempotent).

| Reason | Base | When |
| --- | --- | --- |
| `QUALITY_VISIT` | 20 | Logged visit, fit 4–5 (one per clinic per day) |
| `VISIT` | 8 | Logged visit, fit 1–3 or unknown (one per clinic per day) |
| `OUTCOME_SAME_DAY` | 5 | Structured outcome recorded on the visit day |
| `FOLLOW_UP_ON_TIME` | 10 | Visit on or before a follow-up date set by an earlier visit to that account |
| `ACADEMY_SIGNUP` | 40 | Outcome `ACADEMY_SIGNUP` |
| `FIRST_ORDER` | 60 | Outcome `ORDER_PLACED` on an account with no earlier order |
| `DAILY_TARGET_MET` | 15 | `RepDailySummary.visits` ≥ the DAY/VISITS target |
| `STREAK_MILESTONE` | 25 | Streak reaches 5, 10, 20 or 50 working days |

Anti-gaming: a second visit to the same clinic on the same day earns nothing;
visits without an account earn nothing; DNC accounts never reach the awarder
because they never reach a route.

### Levels and badges

Levels by total XP: Associate 0 · Specialist 500 · Senior 1 500 · Elite 3 500 ·
Master 7 000. Levels never go down. Badges are code-defined (`BADGES`) and
stored in `UserBadge` when earned: First steps, Century, Quality focus, Route
master, On a roll (5-day streak), Unstoppable (20), Academy builder, Opener,
Closer, Follow-through.

### Leaderboard

`getLeaderboard` ranks active reps by period points (week Mon–Sun or calendar
month) within one province, or nationally for admins. Ties share a rank.
Reps see the top 3 plus the two reps on either side of themselves; admins see
the full list. Admins are never ranked.
"My day" shows the rep's level, this week's rank and distance to first place.

## Phase 3 — rep "My day" panel

Shown at the top of the planner panel on Today's Route (`/`) for anyone with
`performance.view.own`, until a route is built or the plan is being edited.
Collapsible; the collapsed state is remembered per browser.

| Block | Source | Notes |
| --- | --- | --- |
| Message | `buildDayMessage` | Deterministic "if you reach it" copy: remaining visits, streak at risk, quality target, month pace, follow-ups due. Weekend and no-target fallbacks. Tone: encouraging, never absolute. |
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
| Quality | `qualityStats` | Avg fit, quality share, outcome coverage, overdue follow-ups (follow-up date passed with no later visit to that account). |
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
| `VisitRecord` | `outcomeCode VisitOutcome?` (structured), `fitScoreSnapshot Int?` (fit at visit time) and `durationMinutes Int` (45 or 90). `outcome` stays as the free-text note. |
| `SalesTarget` | Per-rep target: `period` (DAY / WEEK / MONTH), `metric`, `value`, `startsOn`, optional `endsOn`. Unique on (user, period, metric, startsOn). |
| `RepDailySummary` | One row per rep per calendar day: visits, clinic slots (`visitSlots`), quality visits, new accounts, follow-ups, academy sign-ups, orders, outcome counts, planned stops / drive minutes, average fit. Recomputed after every visit save. |
| Permissions | `performance.view.own` (all roles), `performance.view.team` and `target.manage` (ADMIN). |
| Visit form | Outcome is a required select; the free-text field became "Outcome note". AI note structuring suggests a code via `inferVisitOutcomeCode` (never overrides a rep's choice). |
| Visit History | Outcome chips, fit column, and a target strip for the signed-in rep. |
| Seed | Default targets for seed reps (10 clinic slots/day, 4 quality visits/day, 5 follow-ups/week, 4 new accounts/month, 2 academy sign-ups/month). |

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

A **quality visit** is any logged visit whose `fitScoreSnapshot` is 4 or 5
(`QUALITY_VISIT_MIN_FIT`). The snapshot reads the latest `AccountQualification`
row when one exists; since prospecting computes qualification at run time and
does not persist it per account today, it falls back to the fit score of the
most recent planned stop (`VisitListItem`) for that account, preferring the
rep's own route. A visit to an account that was never on a planned route gets
`null` and does not count as a quality visit. A **new account** is a visit to an account with no
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
| `src/domain/performance/visitOutcome.ts` | Codes, labels, quality threshold, free-text inference |
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
- XP, levels, badges, leaderboards (phase 4) — `RepDailySummary` is their input.
- Backfill of `outcomeCode` for visits logged before this phase: they keep the
  free-text `outcome` and show it as-is in Visit History.

## Phase 5 — clinic slots (2026-11-05)

A rep's day is **ten clinics of 45 minutes**. The daily `VISITS` target is measured in
clinic slots (`src/domain/performance/visitSlots.ts`): a standard visit is one slot, and a
visit the rep records as **Extended · 90 min** counts as two, so a long demo or training
does not cost the rep their day. The rep picks the duration on the visit form
("Time at clinic"); `VisitRecord.durationMinutes` stores it and
`RepDailySummary.visitSlots` sums it per day. `metricValue("VISITS")` reads `visitSlots`,
so target progress, the daily-target bonus, streaks and the admin KPIs all count slots.
Raw `visits` stays for display and the leaderboard.

Every rep has the ten-slot DAY/VISITS target by default
(`DEFAULT_DAILY_VISITS_TARGET`, via `resolveDailyVisitsTarget`); an admin-set
`SalesTarget` for the same period and metric overrides it. Route planning defaults to ten
stops of 45 minutes (`ROUTING_DEFAULT_VISIT_MINUTES`).

Removed in the same release: challenges (the `Challenge` table and the
`PointEvent.multiplier` / `challengeId` columns; points are now always the base points) and
the MANAGER role (existing managers became ADMIN). Release SQL:
`prisma/releases/2026-11-05_clinic_slots.sql`, applied by `scripts/predeploy.ts`.
