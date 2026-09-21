# Google Places setup — NUVIOR Prime Phase 2

Never put real API keys in this document or in git.

## 1. Google Cloud APIs to enable

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Enable APIs:

1. **Places API (New)** — Text Search (New) and Place Details (New)
2. **Geocoding API** — starting address / postal code → lat/lng

Billing must be enabled on the project. Places (New) and Geocoding are billed separately.

For routing and the browser map (Phase 8 / 8.6):

- **Routes API** — travel matrix + road geometry (`ROUTING_PROVIDER=google`)
- **Maps JavaScript API** — rep-facing map (separate **browser** key; see
  [`GOOGLE_MAPS_SETUP.md`](GOOGLE_MAPS_SETUP.md))

Note (Phase 8.6): the Geocoding API is no longer required — server geocoding
uses Places Text Search, and browser-selected starts arrive with exact
coordinates.

## 2. Create an API key

This is the **server** key — it must never reach the browser. The browser map
uses a separate referrer-restricted key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or
`NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY`, see [`GOOGLE_MAPS_SETUP.md`](GOOGLE_MAPS_SETUP.md)).

1. APIs & Services → Credentials → Create credentials → API key
2. Restrict the key:
   - **Application restrictions:** IP restriction for server-side use (or none for local-only testing)
   - **API restrictions:** restrict to **Places API (New)** (and **Routes API** if reusing the key for routing)
3. Copy the key into your local `.env` (gitignored):

```bash
PLACES_PROVIDER=google
GOOGLE_PLACES_API_KEY=your_key_here
GOOGLE_PLACES_MAX_SEARCHES_PER_RUN=24
GOOGLE_PLACES_CACHE_TTL_SECONDS=86400
GOOGLE_PLACES_FETCH_DETAILS=true
```

## 3. Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PLACES_PROVIDER` | `mock` or `google` | `mock` |
| `GOOGLE_PLACES_API_KEY` | Google API key | empty |
| `GOOGLE_PLACES_MAX_SEARCHES_PER_RUN` | Hard cap on Text Search calls per visit-list run | `24` |
| `GOOGLE_PLACES_CACHE_TTL_SECONDS` | Memory + DB cache TTL | `86400` |
| `GOOGLE_PLACES_FETCH_DETAILS` | Fetch Place Details after dedupe | `true` |

If `PLACES_PROVIDER=google` but the key is missing, the app **falls back to mock** and logs a warning.

## 4. Switch modes

```bash
# Local / CI / no credentials
PLACES_PROVIDER=mock npm run dev

# Real discovery
PLACES_PROVIDER=google GOOGLE_PLACES_API_KEY=... npm run dev
```

## 5. Toronto validation

Controlled city check from the spec (§10):

```bash
# Mock path (always safe)
PLACES_PROVIDER=mock npm run validate:toronto

# Live Google path (uses quota — capped by MAX_SEARCHES)
PLACES_PROVIDER=google GOOGLE_PLACES_API_KEY=... npm run validate:toronto
```

Parameters fixed in the script:

- Province: `ON`
- Start: `M5V 2T6`
- Target: `20`
- Radius: `40` km
- Min fit: `3`

Output distinguishes:

- **From provider** — Google/mock place fields
- **Derived / classified** — NUVIOR taxonomy + org type
- **Verify manually** — practitioners, brands, threads, thin fields

## 6. Cost safeguards built into the app

- Focused keyword queries (not one giant query)
- Progressive radius rings with early stop when candidate volume is high
- Deduplicate by Place ID (then name+address) **before** Place Details
- Configurable max text searches per run
- Response cache (memory + `PlacesApiCache` table)
- Dev logging of search/detail counts
- Clear errors on 401/403/429 / REQUEST_DENIED

## 7. What Google data is used for

Used as **evidence**: name, address, place ID, maps URL, phone, website, hours, rating, review count, Google types.

**Not** used as NUVIOR taxonomy. Classification is deterministic in `src/domain/classifyPlace.ts`.

**Never** written into CRM/internal status fields.
