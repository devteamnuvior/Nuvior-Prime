# Routing runbook (Phase 8 / 8.6)

## Local

```bash
# Synthetic drive times
ROUTING_PROVIDER=mock ROUTE_OPTIMIZATION_ENABLED=true npm run dev

# Geodesic only (durations labeled as estimates / null drive time)
ROUTING_PROVIDER=geodesic npm run dev

# Google Routes (requires Routes API + key)
ROUTING_PROVIDER=google GOOGLE_PLACES_API_KEY=... npm run dev

# Full Google Live (matrix + road geometry + browser map; see GOOGLE_MAPS_SETUP.md)
PLACES_PROVIDER=google ROUTING_PROVIDER=google \
GOOGLE_PLACES_API_KEY=... NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... npm run dev

# Google Demo basemap + mock routing (typical local development)
NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY=... PLACES_PROVIDER=mock ROUTING_PROVIDER=mock npm run dev
```

## Validate

```bash
PLACES_PROVIDER=mock CRM_PROVIDER=mock LLM_PROVIDER=none npm run validate:routing
```

## Fallback

1. Google Routes  
2. RouteCache hit  
3. Geodesic if allowed — **never labeled as drive time**  
4. If hard `maxDriveMinutes` set without driving durations → exclude / warn (do not claim enforcement)

## Road geometry (Phase 8.6)

- Geometry (`computeRoutes`) is fetched only after optimization, once per
  run, cached whole-sequence in `RouteCache.encodedPolyline`.
- Any segment failure, HTTP error, timeout, or budget overrun →
  `routeGeometry=null`; the map shows the dotted schematic + "road geometry
  unavailable" caption and the summary chip reads "Route line schematic".
  The itinerary and matrix data are unaffected.
- Symptom: solid road line missing in Google mode → check server logs for
  Routes API 403 (key/API restriction) and confirm Routes API is enabled.

## Snapshot

`VisitListRun.routeSummaryJson` + per-item sequence / ETA / leg minutes / hours feasibility / geodesic flag. Immutable after write.
