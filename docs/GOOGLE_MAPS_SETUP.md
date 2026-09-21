# Google Maps Platform Setup (Phase 8.6)

NUVIOR Prime's rep-facing map runs on the Google Maps JavaScript API. This
document covers the Google Cloud configuration, key separation, local demo
development, live testing, cost controls, and failure behavior.

## Live validation status: `PENDING_GOOGLE_CREDENTIALS`

This environment **does not currently have production Google Maps credentials**.
Do not invent or embed API keys. The production Google path is selected
automatically when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set.

The **normal local development map** is Google Maps via a **Maps Demo Key**
(`NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY`). Leaflet/CARTO is an emergency fallback
only — it is not the default development experience.

Places and Routes providers stay independent of the map renderer. You can
run a Google Demo basemap with `PLACES_PROVIDER=mock` and `ROUTING_PROVIDER=mock`.

## Map renderer modes

Priority: **Google Live → Google Demo → CARTO fallback**.

| Mode | Env | Map | Treat as production? |
| --- | --- | --- | --- |
| **`google_live`** | `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (preferred) or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Production/staging Maps JS key; full Maps / Places / Routes when those providers are also Google | Yes, when Places + Routes are Google too |
| **`google_demo`** | `NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY` (used only if the live key is empty) | Google basemap + supported Maps JS features. Badge: **Google Demo — not production** | **Never** |
| **`fallback`** | Neither key set | Leaflet + CARTO tiles. Badge: **Fallback map — not Google** | No |

A map showing Google’s watermarked **“For development purposes only”** state
is **not** an acceptable mode. That overlay means billing or API-key errors.
Do not use an unrestricted/broken key as a development stand-in. Use a real
Maps Demo Key (no credit card) or a billed live key.

If the Demo Key or a live browser key cannot run Places Autocomplete (New),
search falls back to the Maps JS Geocoder, then to **Use this address**
(server geocode on Build). Routes geometry degrades to a schematic line.
The Google **basemap stays**.

Action-bar chips (development always visible unless the session is fully live):

- **Google Live**
- **Google Demo**
- **Mock Routing** (`ROUTING_PROVIDER=mock`)
- **Fallback Map**
- **Geodesic estimates** when routing is geodesic

---

## Local development: Maps Demo Key

A [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key)
is a no-cost Google key for prototyping. It is **not** production-ready and is
subject to Google’s Maps Demo Project terms and daily quotas.

### 1. Get the key

1. Sign in with a Google account.
2. Open **[Get a Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key)**
   (or [mapsplatform.google.com/maps-demo-key](https://mapsplatform.google.com/maps-demo-key/)).
3. Click **Get a Demo Key** and accept the terms.
4. Copy the key. Google also emails retrieval instructions; you can look it
   up later in Google Cloud Console.
5. Do **not** put the key in git. `.env` is gitignored.

### 2. Configure NUVIOR Prime

In `.env` (see `.env.example`):

```bash
# Browser map — Demo Key (no billing). Leave the live key empty.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY="<your Maps Demo Key>"
# Optional Cloud Map ID; DEMO_MAP_ID is fine for local demo.
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=""

# Keep Places / Routes on mock (or geodesic) unless you have billed server keys.
PLACES_PROVIDER=mock
ROUTING_PROVIDER=mock
```

`NEXT_PUBLIC_*` values are inlined at **build time**. Restart after changing them:

```bash
rm -rf .next && npm run dev
```

### 3. Confirm the mode

On Today you should see:

- Google basemap (not CARTO)
- Chip **Google Demo**
- Chip **Mock Routing** (if `ROUTING_PROVIDER=mock`)
- Map badge **Google Demo — not production**

You should **not** see:

- Leaflet/CARTO tiles
- Google’s grey “For development purposes only” watermark (that is a key/billing failure — fix the key, do not ignore it)

### 4. What the Demo Key can and cannot do

Per Google’s current Demo Key feature list (subject to change — see the
official page):

**Typically supported on the map:** 2D map rendering, markers, clicks,
drawing, Map ID / `DEMO_MAP_ID`, Place Class / Places UI Kit.

**Independent of the map (our env):** mock Places discovery and mock/geodesic
routing continue to work. They do not require the Demo Key.

**May be limited on Demo:** Places Autocomplete Data API, Routes
`computeRoutes` geometry. If autocomplete fails, type an address or drop a
pin (**Use this address**). If routing is mock/geodesic, the line is schematic
and labelled honestly.

When you need full Places + Routes, use billed keys (`google_live`) as below.

---

## APIs to enable

Enable these in the Google Cloud console (APIs & Services → Library):

| API | Used by | Purpose |
| --- | --- | --- |
| **Maps JavaScript API** | Browser | Basemap, Advanced Markers, polylines, click-to-draw `google.maps.Polygon` (not the deprecated Drawing Library) |
| **Places API (New)** | Browser + Server | Browser: start-location autocomplete (`AutocompleteSuggestion`, `Place.fetchFields`). Server: prospect discovery + start geocoding (`PLACES_PROVIDER=google`) |
| **Geocoding API** | Browser (Maps JS Geocoder) | Reverse-geocode after **Use my location**; optional — coordinates still work if it fails |
| **Routes API** | Server | `computeRouteMatrix` (travel matrix) and `computeRoutes` (road geometry polylines) |

Server-side start geocoding still goes through Places Text Search. Client
starts (autocomplete, pin, geolocation) already carry exact coordinates.
The Maps JS Geocoder is used only to label **Use my location**; if Geocoding
API is disabled, the start still works with a coordinate label.

Do **not** use the deprecated Maps Drawing Library. Drawn areas are created
with map click/tap vertices and `google.maps.Polygon`.

## API keys — browser vs server

Use **two separate keys**. Never one unrestricted shared key.

### Browser key (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`)

- Exposed to the browser by design (inlined into the client bundle).
- API restrictions: **Maps JavaScript API, Places API (New), Geocoding API**.
- Application restriction: **HTTP referrers**, listing:
  - `http://localhost:3000/*` (development)
  - `https://staging.<your-domain>/*` (staging)
  - `https://<your-domain>/*` (production)
- Rotate if it ever appears in logs or screenshots outside the team.

### Browser Demo Key (`NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY`)

- Also exposed to the browser. Used only when the live key is empty.
- Obtain from Google’s Maps Demo Key flow (see **Local development** above).
- Never treat as production-ready. Do not substitute a broken/watermarked key.

### Server key (`GOOGLE_PLACES_API_KEY`, optional `GOOGLE_ROUTES_API_KEY`)

- Server-side only. Never enters the client bundle, never logged.
- API restrictions: **Places API (New), Routes API** only.
- Application restriction: **IP addresses** of your server infrastructure
  (or none during local testing — but keep API restrictions).
- `GOOGLE_ROUTES_API_KEY` is optional; the routing provider falls back to
  `GOOGLE_PLACES_API_KEY` when unset.

The code enforces the separation: browser map config is resolved by
`src/lib/mapsConfig.ts`, which only reads an allow-list of `NEXT_PUBLIC_*`
names and never falls back to a server key (unit-tested).

## Map ID (Cloud styling)

The map preserves the NUVIOR visual direction through a **Cloud-styled Map
ID** rather than inline JSON styles (required for Advanced Markers).

1. Google Cloud console → Google Maps Platform → **Map Styles**: create a
   style with: reduced POI density (hide most POI labels, keep transit
   stations off), muted landscape/water colors, legible road labels. Do not
   hide road networks or geography.
2. **Map Management** → create a Map ID (JavaScript, Vector), associate the
   style.
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to that Map ID.

Without a Map ID the app uses `DEMO_MAP_ID`, which renders default styling
and is acceptable for development only.

## Environment variables

```bash
# Browser (safe to expose — HTTP referrer restricted)
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY="<billed browser key>"  # preferred live name
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="<legacy live alias>"
NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY="<Maps Demo Key>"          # local; used if live is empty
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID="<map id>"                   # optional; DEMO_MAP_ID default

# Server (secret — never NEXT_PUBLIC_)
PLACES_PROVIDER="mock"          # or google
GOOGLE_MAPS_SERVER_KEY="<server key>"
GOOGLE_PLACES_API_KEY="<legacy server alias>"
ROUTING_PROVIDER="mock"         # or geodesic | google
# GOOGLE_ROUTES_API_KEY="<optional Routes-only alias>"
```

`NEXT_PUBLIC_*` values are inlined at **build time** — restart `npm run dev`
or rebuild after changing them.

## Local live-Google testing

**Status: `PENDING_GOOGLE_CREDENTIALS`.** Do not skip this checklist when keys
exist; do not block product work on it while they do not.

1. Create both keys as above (add `http://localhost:3000/*` to the browser
   key's referrers).
2. In `.env` set: `PLACES_PROVIDER=google`, `ROUTING_PROVIDER=google`,
   `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and optionally
   `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.
3. Restart the dev server (`rm -rf .next && npm run dev`).
4. Chips: **Google Live** is hidden only when Places and Routes are also
   Google. A live map with mock routing shows **Google Live** + **Mock Routing**.

Required Google-live checks (unchanged from Phase 8.6):

1. Google basemap visibly renders
2. Address autocomplete returns Google Places
3. Selecting a place creates START at the correct location
4. Clicking the map can create/change START
5. Current location works after explicit permission
6. Numbered clinic markers render
7. Marker/list sync (and hover choreography) works
8. Actual Google road polyline renders
9. Itinerary order matches the route
10. Open in Google Maps works
11. Failure/fallback states remain usable

Until credentials exist, items 1–8 and 11 are covered by mocked unit tests
and mock-mode browser smoke; they are **not** live-verified.

## Experience-mode indicator

Today’s action bar shows chips unless the session is fully Google Live
(live map + Google Places + Google routing):

- **Google Live** — billed/staging Maps JS key
- **Google Demo** — Maps Demo Key; not production-ready
- **Fallback Map** — Leaflet/CARTO; no usable Google key
- **Mock Routing** — `ROUTING_PROVIDER=mock`
- **Geodesic estimates** — `ROUTING_PROVIDER=geodesic`

Places mock vs Google is independent of the map renderer.

## What generates billable calls

| Action | API | Mitigation |
| --- | --- | --- |
| Typing in start-location search | Places autocomplete | 300 ms debounce, 3-char minimum, session tokens (one session billed per completed selection) |
| Selecting a suggestion | Place Details (`fetchFields`) | Only on selection; limited field mask (`location`, `formattedAddress`, `addressComponents`, `id`) |
| Building a route (discovery) | Places Text Search / Details | Server cache (`GOOGLE_PLACES_CACHE_TTL_SECONDS`), `GOOGLE_PLACES_MAX_SEARCHES_PER_RUN` cap |
| Travel matrix | Routes `computeRouteMatrix` | `RouteCache` persistence, `ROUTING_MAX_API_CALLS`, candidate cap |
| Road polyline | Routes `computeRoutes` | Whole-sequence geometry cache in `RouteCache` (TTL `ROUTING_CACHE_TTL_SECONDS`); ≤ 1 call per 26-stop segment; skipped entirely if it would exceed the API budget |
| Map loads/pans | Maps JavaScript | Map mounts once per page; markers/polylines update in place (no remounts per route) |

Free actions: dropping a pin, "Use my location" (browser geolocation, no
reverse-geocode), drawing/editing a working area, marker/list selection.

## Quota and billing safety

In Google Cloud console:

- **Quotas**: cap daily requests for Places API (New) and Routes API to a
  sane ceiling for your team size (e.g. a few thousand/day).
- **Budgets & alerts**: create a billing budget with email alerts at 50/90%.
- Review usage after the first week of staging use.

## Failure behavior

| Failure | Behavior |
| --- | --- |
| Maps JS fails to load / auth error | "Map unavailable" card; itinerary, drawer, briefs all keep working |
| No live or demo browser key | Leaflet/CARTO **Fallback Map** only — not the default development path |
| Demo Key missing a feature (e.g. Places autocomplete) | Honest inline notice; Google basemap stays; type an address or drop a pin |
| Watermarked “For development purposes only” | Not a supported mode — billing/API error; replace the key with a Demo Key or a billed live key |
| Places autocomplete errors | Inline notice; plain address + server geocode when building the route |
| Geolocation denied/unavailable | "Location access isn't available. Search an address or choose a point on the map." |
| `computeRoutes` geometry fails / budget exceeded | Route still builds; map shows dotted schematic with caption "Planned sequence — road geometry unavailable"; summary chip shows "Route line schematic" |
| Routes matrix fails | Existing Phase 8 fallback (cache → geodesic with warnings) is unchanged |

Straight lines are never presented as road geometry, and mock data is never
presented as live.

## Privacy

Browser geolocation is requested only when the rep clicks **Use my
location**, uses a single `getCurrentPosition` call (no `watchPosition`), is
used solely for the route starting point, and is never sent anywhere except
as the start coordinates of a route the rep builds. Address search and Places
autocomplete never call the Geolocation API.

The app ships `Permissions-Policy: geolocation=(self)` (`next.config.ts`).
`geolocation=()` is incorrect — it blocks the opt-in button. `geolocation=*`
is not used.

### Iframe / preview limitation

`X-Frame-Options: DENY` prevents other sites from framing the app. Some
development previews still load `localhost` inside a cross-origin iframe.
The page cannot override a parent policy that omits `allow="geolocation"`.
Open Today as a **top-level** tab (`http://localhost:3003/` or the configured
dev URL). Search and Drop a pin remain available if location is blocked.

## Route geometry segmentation

`computeRoutes` accepts at most 25 intermediate waypoints. For longer days,
`segmentRouteRequests` (in `src/domain/routing/polyline.ts`) splits the final
ordered sequence `[start, stop1 … stopN]` into sequential requests of at most
27 points each, where each segment's destination is the next segment's
origin. Segments are rendered consecutively as one continuous route; the
optimized stop order is never altered and no stop is dropped. A failed
segment discards the whole geometry (schematic fallback) rather than showing
a partial road route.
