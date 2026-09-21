# Route Map UX (Phase 8.5 → 8.8)

How the Today's Route map behaves, which implementation renders it, and how
map state flows through the planner.

**Live Google validation: `PENDING_GOOGLE_CREDENTIALS`.** The production Google
path from Phase 8.6 is intact. Local development should use a **Maps Demo Key**
so the Google basemap is the daily canvas. Leaflet/CARTO is an emergency
fallback only (no usable live or demo key). UX in this document applies to
all three renderers.

Phase 8.8 makes Today **map-first**. See `MAP_FIRST_PLANNING.md` for the planner
state machine, start/area UX, compact controls, edit/rebuild, and mobile sheet.

## Map implementations

| Map | When | Notes |
| --- | --- | --- |
| **GoogleRouteMap** | `google_live` (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) or `google_demo` (`NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY`) | Google Maps JavaScript API via `@vis.gl/react-google-maps`. Demo is labelled **Google Demo — not production** and is never treated as production-ready |
| **RouteMap** (`src/components/today/RouteMap.tsx`) | `fallback` — neither key set | Leaflet + CARTO **emergency** fallback. Badge: **Fallback map — not Google** |

`MapCanvas` selects by priority **live → demo → fallback**. Mock Places / mock
Routes are independent of the renderer.

## Marker states

Both maps render the same `.nv-pin` design-system markers (see
`DESIGN_SYSTEM.md`): START (S), numbered stops, revisit, opening-hours
warning, selected, hover. On Google these are Advanced Markers with custom HTML
content, center-anchored. Marker numbers always equal the itinerary **display**
sequence (optimizer sequence unless the rep reordered/removed stops).

When a route is ready, START → Stop 01 draws forward once (~850ms) as a
continuous solid line, then settles into a static gradient. Remaining legs
stay quieter. Selecting a later stop restyles that incoming leg the same
way — no replay, no traveling marker. `prefers-reduced-motion: reduce`
skips the reveal and shows the hierarchy immediately. Mock legs are
straight segments; real Routes geometry is never straightened.

## Map ↔ itinerary synchronization

- Clicking a marker selects the stop: itinerary row highlights and scrolls
  into view, clinic drawer opens, marker gets the selected state.
- Clicking an itinerary stop selects the marker and pans the map to it.
- Hovering a stop in either surface emphasizes the other (`hoveredId`).
- During drop-pin / draw-area modes, stop markers are inert so map clicks
  are not stolen.
- Selection state is a single `selectedId` in `TodayRoute` — there is no
  duplicated state to drift.

## Manual reorder / remove

Selecting a stop exposes Move earlier / Move later / Remove. This is a
**display overlay** (`src/components/today/manualPlan.ts`):

- The optimizer snapshot is never mutated.
- Display sequence is re-numbered 1…n.
- Arrival times, drive legs and road geometry are hidden (honest: they
  belong to the optimized order).
- Summary strip drops driving/finish metrics and shows
  "Manually adjusted — rebuild to recalculate".
- Restore optimized returns to the original plan.
- A new build resets the overlay.

## Route line truthfulness

- With `ROUTING_PROVIDER=google`, the final optimized sequence is sent to
  Routes API `computeRoutes` and the real road polyline renders (solid teal
  with a light casing so it reads against the basemap).
  The summary strip shows "Road route" (+ "· traffic" when traffic-aware) and
  diagnostics show provider/segments/cache state.
- When geometry is unavailable (mock/geodesic providers, API failure, budget
  exceeded, **or a manually adjusted order**), the map draws a solid
  straight-line schematic with the caption
  "Planned sequence — road geometry unavailable" and the summary chip reads
  "Route line schematic". Straight lines are never presented as roads.

## Working area (drawn polygon)

User-facing name: **Today’s area** (Phase 8.8). “Draw today’s area” enters draw
mode: planner sheet closes, each map click adds a vertex (Undo/Cancel/Finish
banner). Live fill preview appears at 3 points; tapping the first vertex
(larger ring) or Finish closes the polygon. Escape cancels; Enter finishes
when closable. Approximate area (km²) is shown on the banner and in the planner.
A non-drawing fallback is **Travel reach** (30 / 45 / 60 min).
- On Google Maps the finished polygon stays editable by dragging vertices;
  Clear removes it. The Leaflet fallback supports draw/clear, not vertex
  drag-edit.
- Canonical geometry is a lat/lng vertex array
  (`src/domain/geo/workingArea.ts`), submitted as `workingAreaJson`.
- **Semantics**: it is a planning constraint, already wired — discovery
  candidates outside the polygon are excluded before qualification
  (`pointInWorkingArea` in `runProspectSearch`), and diagnostics report how
  many candidates were excluded. It does not alter qualification, DNC, CRM or
  routing rules for candidates inside the area.

## Loading / ready states

While a route is building: a map overlay cycles through honest pipeline
stage hints (indeterminate — one server round trip): Searching today’s area…
Finding qualified accounts… Checking travel times… Building your route…
After a result exists, a failed rebuild keeps the previous itinerary visible.

## Candidate layer (Phase 8.8)

Qualified-but-not-routed accounts render as small unnumbered dots
(`.nv-pin--candidate`), subordinate to numbered stops. Built from
`qualifiedPool` only — DNC never appears. Capped to avoid crowding.

## Mobile bottom sheet

**Planning:** collapsed shows start, today’s area, BUILD MY DAY; expanded shows
compact controls. **Route:** collapsed shows next stop / arrival; expanded
shows itinerary. The selected-clinic panel remains a bottom sheet on small
viewports (grab handle, swipe down to dismiss). Touch targets remain ≥ 44px
for primary actions.

## Failure states

See `GOOGLE_MAPS_SETUP.md` → "Failure behavior". The itinerary panel never
depends on the map: if Maps JS fails, a "Map unavailable" card renders in the
map region and everything else keeps working.

## Start-location methods

1. **Search** — Google Places autocomplete (`StartLocationField`). Uses the
   current Autocomplete Data API (`AutocompleteSuggestion` + session tokens),
   debounced 300 ms, Canada-biased. Selection fetches structured fields and
   keeps Place ID, formatted address, exact lat/lng, province and postal code
   from address components (never string-parsed). Without Google, the field
   is a plain input geocoded server-side.
2. **Use my location** — explicit button; one-shot browser geolocation. On
   success the exact coordinates become the start (no reverse-geocode). On
   denial: "Location access isn't available. Search an address or choose a
   point on the map."
3. **Drop pin** — button enters pin mode (planner closes, banner appears);
   the next map click becomes the start. Any point is allowed — a start never
   needs to be a Google place.

All three produce a `StartSelection` (`src/lib/placeSelection.ts`) submitted
as hidden `startLat`/`startLng`/`startPlaceId`/`startLabel` fields. When
present, the server uses the exact coordinates and skips geocoding.

## Interaction modes

`TodayRoute` holds one `interaction` state: `none` (marker selection),
`set-start` (next click = start pin), `draw-area` (clicks append vertices).
Modes are entered from the planner and always show an on-map banner with a
cancel action.

