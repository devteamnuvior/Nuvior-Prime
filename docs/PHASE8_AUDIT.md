# Phase 8 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Complete  
**Scope:** Drive-time routing, route optimization, visit-window feasibility — **downstream of qualification**.

## Current geodesic behavior

- Discovery and `buildDailyVisitList` use **haversine km** only.
- Visit ordering: nearest → farthest, then slice to daily target.
- Presentation sort: postal FSA then fit descending.
- `durationMinutes` on geodesic provider is always `null`.
- No max drive-time constraint; only `maxRadiusKm`.

## Current routing interface

```ts
interface RoutingProvider {
  name: string;
  distanceBetween(origin, destination): Promise<RouteDistance>;
}
```

Only `GeodesicRoutingProvider` is wired (`getRoutingProvider`).

## Provider / API options

| Option | Notes |
|---|---|
| Geodesic | Free; not drive time — keep as fallback / legacy |
| Mock | Deterministic synthetic drive times for tests |
| Google Routes API | `computeRouteMatrix` / `computeRoutes` (current) — enable **Routes API** |

Reuse `GOOGLE_PLACES_API_KEY` when `GOOGLE_ROUTES_API_KEY` unset (same Google Cloud key with Routes enabled).

## Cost implications

Matrix is O(n²) worst case. Phase 8 caps:

- candidate pool before matrix
- max API calls / matrix elements per run
- cache TTL
- geodesic prefilter before any paid call

## Route constraints

Must enforce (when provided): max radius km, max one-way drive minutes, workday window, visit durations, optional lunch block, opening-hours honesty.

Qualification / DNC / taxonomy / min fit remain authoritative — routing never promotes low-fit accounts.

## Unresolved assumptions

- Exact traffic model availability depends on Routes API request options / region.
- Opening-hours JSON shape varies (Places New `regularOpeningHours`); parse defensively.
- True TSP is NP-hard — Phase 8 uses **deterministic greedy utility** with documented weights, not exact optimal.

## Proposed optimization strategy

1. Qualify + DNC + revisit + radius prefilter (existing).  
2. Cap pool (`ROUTING_MAX_CANDIDATES`).  
3. Travel matrix start→candidates (+ pairwise as budget allows).  
4. Filter hard drive-time / closed-today.  
5. Greedy route: maximize `fit×W_fit + revisit×W_rev − travel×W_travel − schedulePenalty`.  
6. Persist immutable route snapshot on visit-run items.  
7. Fallback: google → cache → geodesic (labeled) → route-unavailable warning.
