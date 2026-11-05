## Summary

Four bodies of work on top of `main`:

1. **MUI dashboard rebuild** — the app shell, login, admin users and Today's Route moved from Tailwind to a light-only MUI theme with design tokens (`src/theme`), a fixed icon-rail sidebar, animated breadcrumbs, command search, a redesigned Team Members admin page and exact loading skeletons for every admin page. Login keeps a clean `/login` URL and carries the return path in a short-lived cookie.
2. **Rep performance, phases 1–4** (`docs/PERFORMANCE.md`):
   - **Phase 1 — data and targets.** `VisitRecord.outcomeCode` (nine structured outcomes), `fitScoreSnapshot` and `durationMinutes` (45 or 90); `SalesTarget` (DAY / WEEK / MONTH over five metrics with a validity window); `RepDailySummary` rebuilt after every visit save; permissions `performance.view.own`, `performance.view.team`, `target.manage`; the visit form requires an outcome and a time at the clinic; Visit History gets outcome chips, a fit column and a target strip.
   - **Phase 2 — admin per-rep page** at `/admin/users/[id]`: KPI row (target hit rate, plan adherence, visit → order, drive min / visit), weekly visits vs target, funnel, lead product mix, activity calendar, quality panel (average fit, outcome coverage, overdue follow-ups), targets editor, recent visits / routes, audit history. Adds `@mui/x-charts`.
   - **Phase 3 — "My day" panel** on Today's Route: deterministic "if you reach it" message, daily target bars, 14-day strip, month-to-date vs last month, team fit benchmark (aggregate only), follow-ups due, streak.
   - **Phase 4 — competition layer.** Append-only `PointEvent` ledger (unique per user/reason/source, so awarding is idempotent), levels, nine code-defined badges, `/leaderboard` (week / month, per province; reps see top 3 plus their neighbours, admins the full list). `npm run xp:backfill` awards visits logged before the ledger.
   - **The ten-clinic day.** A rep's day is ten 45-minute clinic slots: the daily VISITS target, the daily bonus, streaks and admin KPIs are measured in slots, so a 90-minute visit counts as two. Every rep has the ten-slot target by default unless an admin sets one.
3. **Live map** at `/live` — admins watch every rep on a full-bleed map (Google with a Leaflet fallback): avatar markers with status, tweened movement, province filter and a side panel. Reps opt in with a "Share location" chip on Today's Route; `RepPosition` keeps the latest fix per user. `docs/LIVE_MAP.md`.
4. **Location-only route planning** — the rep shares a location (browser geolocation or a dropped pin) and the day builds itself: ten clinics within a 30-minute reach. Clinics anyone on the team visited in the last 90 days come off the pool and are shown as "Already visited nearby" (`src/lib/teamVisits.ts`).

Removed along the way, end to end: the MANAGER role (REP and ADMIN only), challenges and point multipliers, and "quality visits" (the fit ≥ 4 target metric, point reason and badge). Every logged visit now earns the same VISIT base.

## Why

Visit outcomes were free text and no target existed, so nothing about a rep's day could be summed. These phases add the data layer first, then the views on top of it, without touching qualification, DNC, CRM or routing rules. Points reward follow-through and strategic outcomes, never raw volume; every point is a ledger row tied to a visit, a day or a streak.

## Reviewer notes

- **Schema changes** ship as hand-written release SQL in `prisma/releases/` (no migrations dir in this repo): `2026-11-02_performance_live_map.sql` (new enums `VisitOutcome`, `TargetPeriod`, `TargetMetric`, `PointReason`; new models `SalesTarget`, `RepDailySummary`, `PointEvent`, `UserBadge`, `RepPosition`, `ClinicWebProfile`; nullable columns on `VisitRecord`), `2026-11-05_clinic_slots.sql` (visit duration and daily slots; drops `Challenge` and the MANAGER role, turning existing managers into admins) and `2026-11-05_quality_visits_removed.sql` (rebuilds the `TargetMetric` and `PointReason` enums, turns `QUALITY_VISIT` ledger rows into `VISIT` with their points kept, drops `RepDailySummary.qualityVisits`).
- **Production deploy:** `npm run build` runs `scripts/predeploy.ts` before `next build`. On Vercel production only, it checks it is on the expected database, backs up every public table into a timestamped schema, applies each pending release in one transaction, verifies the objects, runs the XP backfill once while the ledger is empty, and fails the build on any error so the current deployment stays live. Elsewhere it returns immediately; local dev uses `prisma db push`.
- `AccountQualification` is never persisted today, so `fitScoreSnapshot` falls back to the fit score of the rep's most recent planned stop for that account. See `docs/PERFORMANCE.md`.
- Dates are stored at UTC midnight and compared as `YYYY-MM-DD` keys; Visit History formats visit dates in UTC so they no longer shift a day.
- Province-scoped admins reach the per-rep page and set targets only for reps who share one of their provinces; national admins everywhere. Territory checks are server-side in the actions (`docs/AUTHORIZATION.md`).
- Dev: after pulling, run `npx prisma generate` and restart any running dev server — a server started before the generate keeps the old client in memory.
- Seed adds default targets for the seed reps and live positions for the dev reps (`npm run live:simulate` moves them).

## Checks

- `npm run test` — 438 passed
- `npm run typecheck`, `npm run lint` — clean
- Pages verified in the browser as rep and admin: Visit History, `/admin/users/[id]`, Today's Route panel, `/leaderboard`, `/live`.
- Each release SQL applied against the local Docker Postgres in one transaction; the 2026-11-02 release was also rehearsed against a copy of the dev database rolled back to the deployed schema (backup verified, second run a no-op).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
