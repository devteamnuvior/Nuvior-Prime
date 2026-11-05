# Live Map (admin / manager)

Status: v1. Replaces Today's Route for administrators.

## What it is

`/live` is a full-bleed map of every active rep the viewer may see, with a side
panel (status, current clinic, last update, click-to-focus) and a province filter
with an "All provinces" option for national admins. Positions refresh in the
browser every few seconds (`POLL_INTERVAL_MS`) without a reload; markers glide to
their new position and pulse while a fix is fresh.

## Access

| Permission             | REP | MANAGER | ADMIN | Used by                                   |
| ---------------------- | --- | ------- | ----- | ----------------------------------------- |
| `route.plan`           | ✓   | ✓       |       | Today's Route (`/`) — admins are redirected to `/live` |
| `position.report`      | ✓   | ✓       |       | `POST /api/positions`, the "Share location" chip on Today's Route |
| `position.view.team`   |     | ✓       | ✓     | `/live`, `GET /api/live/reps`             |

Managers see reps in their own provinces; admins (`*`) see everyone.

## Data

- `RepPosition` — one row per user, overwritten on every report: `lat`, `lng`,
  `accuracyM`, `headingDeg`, `speedMps`, `accountId` (the clinic the rep is at,
  resolved as the closest account within `AT_CLINIC_RADIUS_M`), `source`
  (`device` / `seed` / `sim`), `recordedAt`.
- Status is derived, never stored (`src/domain/live/positions.ts`): `at_clinic`
  when a clinic is resolved, `travelling` while a fresh fix is moving, `idle` when
  still or older than `STALE_AFTER_MS`, `offline` after `OFFLINE_AFTER_MS` or with
  no fix at all.

## Rep side

The "Share location" chip in Today's Route's action bar is opt-in. Once on, the
browser's `watchPosition` posts a fix at most every `REPORT_INTERVAL_MS`; the
choice is remembered per browser and resumed on the next visit. Nothing is
requested before the first click (see `src/lib/browserGeolocation.ts`).

## Local development

- `npm run db:seed` places the Ontario rep at a Toronto clinic and the Alberta
  rep on the road near Calgary.
- `npm run live:simulate` drives every active rep between the clinics of their
  province (drive → dwell → next). `LIVE_SIM_SPEED_MPS`, `LIVE_SIM_TICK_MS`,
  `LIVE_SIM_DWELL_TICKS` tune it.

## Files

- `src/app/(dashboard)/live/page.tsx` — server page, permission + province gate
- `src/components/live/` — `LiveMap` (layout, status bar, filter), `RepPanel`,
  `LiveMapCanvas` (Google → Leaflet fallback, same as Today's Route),
  `useLiveReps` (polling, pause when hidden) and `useAnimatedPositions` (tween)
- `src/app/api/live/reps/route.ts`, `src/app/api/positions/route.ts`
- `src/lib/livePositions.ts`, `src/domain/live/positions.ts`
- marker CSS: `.nv-rep*` in `src/app/globals.css`
