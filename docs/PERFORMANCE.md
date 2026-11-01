# Rep performance — phases 1 and 2

**Status:** Phase 1 complete (structured outcomes, targets, daily summaries) · Phase 2 complete (admin per-rep page)  
**Next:** Phase 3 rep dashboard · Phase 4 XP / leaderboard · Phase 5 Odoo orders

## Phase 2 — admin per-rep page

`/admin/users/[id]` (linked from the Users table name, its row menu "View
performance", and the rep name on Team Activity). Gated by
`performance.view.team`; managers only reach reps who share one of their
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
| `VisitRecord` | `outcomeCode VisitOutcome?` (structured) and `fitScoreSnapshot Int?` (fit at visit time). `outcome` stays as the free-text note. |
| `SalesTarget` | Per-rep target: `period` (DAY / WEEK / MONTH), `metric`, `value`, `startsOn`, optional `endsOn`. Unique on (user, period, metric, startsOn). |
| `RepDailySummary` | One row per rep per calendar day: visits, quality visits, new accounts, follow-ups, academy sign-ups, orders, outcome counts, planned stops / drive minutes, average fit. Recomputed after every visit save. |
| Permissions | `performance.view.own` (all roles), `performance.view.team` and `target.manage` (MANAGER, ADMIN). |
| Visit form | Outcome is a required select; the free-text field became "Outcome note". AI note structuring suggests a code via `inferVisitOutcomeCode` (never overrides a rep's choice). |
| Visit History | Outcome chips, fit column, and a target strip for the signed-in rep. |
| Seed | Default targets for seed reps (7 visits/day, 4 quality visits/day, 5 follow-ups/week, 4 new accounts/month, 2 academy sign-ups/month). |

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

Managers can set targets only for reps who share one of their provinces; admins
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
