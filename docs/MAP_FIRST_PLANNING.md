# Map-first planning (Phase 8.8)

Today is a geography-first workspace: **I am here. I want to work this area
today. Build the best sales day for me.**

The large form-first planner is no longer the primary rep flow. Geography is
the input; compact day controls are secondary. Qualification, DNC, CRM, fit,
certification, revisit logic, territory authorization, and route optimization
are unchanged — this phase only changes how planning inputs are collected and
how results are shown on the same map.

**Live Google validation remains `PENDING_GOOGLE_CREDENTIALS`.** Phase 8.8 is
testable with mock Places/Routes on a **Google Demo** basemap. Leaflet is only
the emergency fallback. Do not add keys to the repo. The production Google
path from 8.6 is untouched. See `GOOGLE_MAPS_SETUP.md` for Demo Key steps.

Related: `ROUTE_MAP_UX.md`, `ROUTING.md`, `GOOGLE_MAPS_SETUP.md`.

---

## Planner state machine

`src/domain/planning/plannerState.ts` — pure, unit-tested.

| Phase | Meaning | Primary UI |
| --- | --- | --- |
| **A. `no-start`** | No start chosen | Map + “Choose your starting point” |
| **B. `choose-area`** | Start set | “Where do you want to work today?” |
| **C. `configure`** | Start + valid area | Compact day controls + **BUILD MY DAY** |
| **D. `building`** | Pipeline running | Same map + staged overlay |
| **E. `route-ready`** | Optimized route | Numbered stops + itinerary |
| **F. `route-adjusted`** | Manual reorder/remove | Overlay itinerary; times hidden until rebuild |
| **`edit-plan`** | Route exists; planning controls open | Inputs shown; route kept |
| **`stale`** | Material input changed after a route | Banner + **Rebuild route**; prior route kept |

`BUILD MY DAY` is enabled only when `canBuildDay` is true: a start (coordinates
or committed address/postal for mock geocode), an authorized province, and a
valid area strategy (travel reach **or** valid drawn polygon).

---

## Start-location UX

Three modes, all producing the existing canonical `StartSelection`:

1. **Use my location** — user-initiated only. Never requested automatically.
   Requires `Permissions-Policy: geolocation=(self)` (see `next.config.ts`).
   If Chrome reports a permissions-policy violation, open the app as a
   top-level tab — a parent iframe cannot be overridden from inside.
2. **Search** — Google Places autocomplete when the Google map (live or demo)
   can load the Places library. If that library is unavailable, plain
   address/postal + **Use this address**. Without any Google key, same
   address fallback on the Leaflet map.
3. **Drop pin** — next map click. Result stays editable via **Change start**.

Before a start is selected, the three actions are prominent. After selection:
START marker, concise label, **Change start**. The three choosers recede.

---

## Province / territory

Province is **not** a dominant required field when location determines it.

Resolution order (`src/domain/planning/province.ts`):

1. Google Place / address-component province
2. Postal FSA letter
3. Coordinate bounding boxes
4. The user’s sole authorized province
5. Manual picker only when several provinces are allowed and location is unresolved

Authorization is the final gate. A start (or drawn area) outside assigned
territory is rejected with an explanation. Territory is never silently switched.
Managers/admins (or anyone with more than one allowed province) can use
**Plan somewhere else** to clear the start and pick another location — never
a silent territory switch.

---

## Auto Area (travel reach)

Presets: **30 / 45 / 60 min**. Label: `Travel reach: 45 min`.

This is a real `maxDriveMinutes` planning constraint, not a drawn isochrone.
Candidate/route selection respects it when verified drive-time data exists
(`ROUTING_PROVIDER=google` or synthetic `mock` times).

Geodesic mode shows the existing honest limitation — estimated times, no claim
of a true 45-minute road boundary. **No fake isochrone polygon is drawn.**

A geodesic search envelope (`travelReachRadiusKm`) bounds Places discovery
(40 / 55 / 70 km). That envelope is not shown as a road-time area.

---

## Draw Area (Today’s area)

Uses the Phase 8.6/8.7 polygon interaction with user-facing copy (“Today’s
area”, not GIS terms):

- draw / finish / edit / clear / redraw
- Esc cancel, Enter finish when valid
- “Can’t draw? Use travel reach above.”

After completion: compact summary (`Today’s area · 8.4 km²`) + Edit / Clear.

Discovery remains restricted to the polygon (`pointInWorkingArea`) **before**
qualification. **Due revisits outside the drawn area are excluded** — there is
no revisit exception. A name listed under Advanced → Revisits due is still
only considered if that account was discovered inside the polygon. Do not
change this silently.

Invalid areas never run discovery: fewer than 3 points, self-intersection, tiny
accidental polygons, or vertices outside authorized territory.

`SAVED_AREA_PRESETS` is an empty placeholder (Downtown Toronto, North York,
Mississauga West) for a future saved-areas feature — not a Phase 8.8
requirement.

---

## Compact day controls

Primary (visible once an area exists):

- Target visits
- Day start / Day end — **12-hour labels** (`9:00 AM`, `5:00 PM`)
- Minimum fit

Secondary, collapsed under **Advanced planning**:

- Search radius (km)
- Max one-way drive (min)
- Already visited / not due
- Revisits due today
- Note that visit duration and lunch use existing routing defaults

CTA: **BUILD MY DAY** (or **Rebuild route** when editing a live plan).
Supporting line: “Find the highest-value feasible visits in today’s area.”

---

## Candidate / opportunity layer

After BUILD MY DAY, as soon as the qualified pool exists (no extra discovery
call):

- Compact summary: e.g. `31 qualified accounts · 8 Fit 5 · 12 Fit 4 · 2 revisits due`
- Subordinate map dots (`.nv-pin--candidate`) for qualified-but-not-routed
  accounts. Cap 40. No numbers. Pointer-events none.
- **DNC never appears** — the layer is built from `qualifiedPool` only.
- Numbered route stops stay visually dominant.

---

## Planning → route transition

The same workspace transitions in place. No separate results page.

Overlay stages (indeterminate, one server round-trip):

1. Finding clinics in this area…
2. Evaluating accounts…
3. Building today's best route…

After optimization: numbered stops, route geometry, itinerary, summary strip.
START and Today’s area remain on the map.

Desktop: map ~65%, planner ~34%. After a route, the planner panel becomes the
itinerary; **Edit plan** re-opens compact controls without destroying the route.

---

## Edit / rebuild

- **Edit plan** exposes inputs; the current route stays on the map.
- A material fingerprint change (start, area, day window, target, min fit,
  drive/radius, visited lists) marks the route **stale** and shows
  **Rebuild route**.
- Rebuild **success** replaces the committed route.
- Rebuild **failure** retains the previous route and shows an error banner.
- **New plan** clears the session plan. Confirmation only when a route exists.

Changing START after an area/route exists surfaces the stale banner: travel
calculations need rebuilding. Drive times are never silently kept invalid.

---

## Mobile / tablet

Existing bottom-sheet direction.

**Planning, collapsed:** start label, today’s area status, **BUILD MY DAY**.

**Planning, expanded:** compact controls.

**Route, collapsed:** next stop, arrival, drive-time honesty.

**Route, expanded:** itinerary.

The map stays usable at all times. Geolocation remains the primary start
affordance on small screens, still user-initiated.

---

## Session memory

Within the current session, start, area, day controls, and the committed route
survive brief/drawer open-close. Planner inputs are also written to
`sessionStorage` so an accidental refresh does not wipe Today's Area. This is
not a reusable territory-preset system.

---

## Product positioning

| Surface | Role |
| --- | --- |
| **Today** (`/`) | Operational route planning |
| **Prospecting** (`/accounts`) | Deeper account discovery / research |

---

## Developer / provider status

Rep-facing: chips for **Google Demo**, **Mock Routing**, **Fallback Map**,
and geodesic when those apply. Fully live sessions hide chips. Full provider
diagnostics remain in the itinerary for managers/admins.

---

## Google credential limitation

`PENDING_GOOGLE_CREDENTIALS` for billed live APIs. Local map development uses
a Maps Demo Key (`NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY`) with mock Places/Routes.
Leaflet is emergency fallback only. Production Maps JS / Places / Routes
code paths are unchanged.
