# NUVIOR Prime

Internal sales prospecting app for NUVIOR provincial reps.

**Source of truth:** [`docs/NUVIOR_PRIME_SPEC.md`](docs/NUVIOR_PRIME_SPEC.md)

## Local setup (Phases 1–8)

```bash
npm install
npm run db:up
cp .env.example .env   # set AUTH_SECRET
npm run db:setup
npm run dev
```

Open http://localhost:3000/login — seed users (password `DevPass123!`):

- `on.rep@nuvior.local` (ON REP)
- `ab.rep@nuvior.local` (AB REP)
- `on.manager@nuvior.local` (ON MANAGER)
- `admin@nuvior.local` (ADMIN, all provinces)

## Routing (Phase 8)

```bash
ROUTING_PROVIDER=mock ROUTE_OPTIMIZATION_ENABLED=true npm run dev
npm run validate:routing
```

Providers: `geodesic` | `mock` | `google` (Routes API). See [`docs/ROUTING.md`](docs/ROUTING.md).

## Google Maps (Phase 8.6)

The rep-facing map is Google Maps. Renderer priority:

1. **Google Live** — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (production/staging)
2. **Google Demo** — `NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY` (local, no billing)
3. **Fallback Map** — Leaflet/CARTO only if neither key is set

Places and Routes stay independent (`PLACES_PROVIDER` / `ROUTING_PROVIDER`).
Typical local setup: Demo Key + mock Places + mock routing.

```bash
# Local: Google Demo basemap, mock data
NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY=... PLACES_PROVIDER=mock ROUTING_PROVIDER=mock npm run dev

# Staging/production map + live APIs
PLACES_PROVIDER=google ROUTING_PROVIDER=google \
GOOGLE_PLACES_API_KEY=... NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... npm run dev
```

Action-bar chips: **Google Live**, **Google Demo**, **Mock Routing**,
**Fallback Map** (plus geodesic when that provider is on). Fully live
sessions hide the chips.

How to get a Demo Key: [`docs/GOOGLE_MAPS_SETUP.md`](docs/GOOGLE_MAPS_SETUP.md).

Live validation of billed Google APIs is **`PENDING_GOOGLE_CREDENTIALS`** — do not
invent keys. See [`docs/GOOGLE_MAPS_SETUP.md`](docs/GOOGLE_MAPS_SETUP.md)
and [`docs/MAP_FIRST_PLANNING.md`](docs/MAP_FIRST_PLANNING.md).

## Map-first Today (Phase 8.8)

Today (`/`) is operational route planning: start → today’s area → compact day
controls → **BUILD MY DAY** on the same map. Prospecting (`/accounts`) is
deeper account research. Travel reach (30/45/60 min) is a real drive-time
constraint, not a drawn isochrone.

## Checks

```bash
npm run test && npm run typecheck && npm run lint && npm run build
npm run validate:auth && npm run validate:crm && npm run validate:routing && npm run validate:product-catalog && npm run validate:clinic-research && npm run validate:product-gaps && npm run validate:product-opportunities
```

## Docs

- [`docs/ROUTING.md`](docs/ROUTING.md) · [`docs/ROUTE_OPTIMIZATION.md`](docs/ROUTE_OPTIMIZATION.md)
- [`docs/GOOGLE_MAPS_SETUP.md`](docs/GOOGLE_MAPS_SETUP.md) · [`docs/ROUTE_MAP_UX.md`](docs/ROUTE_MAP_UX.md)
- [`docs/MAP_FIRST_PLANNING.md`](docs/MAP_FIRST_PLANNING.md)
- [`docs/CRM_INTEGRATION.md`](docs/CRM_INTEGRATION.md) · [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md)
- [`docs/ODOO_PRODUCT_CATALOG.md`](docs/ODOO_PRODUCT_CATALOG.md) · [`docs/PRODUCT_GAP_AUDIT.md`](docs/PRODUCT_GAP_AUDIT.md)
- [`docs/CLAUDE_RESEARCH.md`](docs/CLAUDE_RESEARCH.md) · [`docs/CLINIC_CAPABILITY_PROFILE.md`](docs/CLINIC_CAPABILITY_PROFILE.md) · [`docs/PRODUCT_GAP_ENGINE.md`](docs/PRODUCT_GAP_ENGINE.md) · [`docs/PRODUCT_OPPORTUNITY_SCORING.md`](docs/PRODUCT_OPPORTUNITY_SCORING.md)

Mesoestetic is never a lead product. DNC cannot be overridden by any role. Routing never overrides qualification.
