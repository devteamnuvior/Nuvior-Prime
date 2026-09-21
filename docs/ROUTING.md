# Routing (Phase 8)

## Providers

| `ROUTING_PROVIDER` | Behavior |
|---|---|
| `geodesic` (default) | Haversine km; `durationMinutes=null` — **not** drive time |
| `mock` | Synthetic driving times for local/tests |
| `google` | Google **Routes API** `computeRouteMatrix` |

Enable **Routes API** on the Google Cloud project. Key: `GOOGLE_ROUTES_API_KEY` or reuse `GOOGLE_PLACES_API_KEY`.

## Pipeline position

Qualification / DNC / taxonomy / min-fit → **then** travel matrix → feasibility → route optimization → ordered list.

## Constraints

- `maxRadiusKm` and optional `maxDriveMinutes` (both enforced when set)
- Workday `dayStartClock` / `dayEndClock`
- Visit duration defaults (20m / revisit 25m)
- Optional lunch block 12:00–14:00
- Opening-hours honesty (`UNKNOWN, verify` when missing)

## Cost controls

`ROUTING_MAX_CANDIDATES`, `ROUTING_MAX_API_CALLS`, `ROUTING_CACHE_TTL_SECONDS`, `ROUTING_TIMEOUT_MS`

## Road geometry (Phase 8.6)

With `ROUTING_PROVIDER=google`, after optimization the final ordered sequence
`[start, stop1 … stopN]` is sent to Routes API **`computeRoutes`**
(`polylineQuality=OVERVIEW`, field mask `routes.polyline.encodedPolyline`) and
the encoded polyline(s) are returned in the search payload
(`routeGeometry.encodedSegments`) for the map to render as the real road route.

- **Segmentation**: ≤ 25 intermediates per request; longer routes are split by
  `segmentRouteRequests` into chained segments (destination of one = origin of
  the next). Order preserved; no stop dropped. See `GOOGLE_MAPS_SETUP.md`.
- **Caching**: whole-sequence geometry cached in `RouteCache`
  (`encodedPolyline` column, key = ordered coordinates + traffic mode, TTL
  `ROUTING_CACHE_TTL_SECONDS`).
- **Budget**: geometry requests count against `ROUTING_MAX_API_CALLS`; if the
  segments would exceed it, geometry is skipped entirely.
- **Truthfulness**: geometry is presentation-only (never used in
  qualification/optimization). Any failure yields `routeGeometry=null` and the
  UI renders a dotted schematic labelled "road geometry unavailable" — a
  straight line is never presented as a road route.

## Client-selected start (Phase 8.6)

When the browser supplies an exact start (`startLat`/`startLng` from Places
autocomplete, dropped pin, or user-initiated geolocation), the server uses
those coordinates directly and records `startMeta.geocodeProvider` as
`client_google_place` or `client_selection` — no server geocoding call.

See `ROUTE_OPTIMIZATION.md`, `ROUTING_RUNBOOK.md`, `ROUTE_MAP_UX.md`,
`MAP_FIRST_PLANNING.md`, `GOOGLE_MAPS_SETUP.md`.

## Map-first planning (Phase 8.8)

Today collects geography first (start + travel reach or drawn area), then
compact day controls, then **BUILD MY DAY** on the same map. Travel-reach
presets (30 / 45 / 60 min) submit `maxDriveMinutes`. Drawn “Today’s area”
submits `workingAreaJson`. Province is inferred from the start; authorization
still gates `requireProvinceAccess`. UI-only — optimizer and discovery rules
are unchanged.
