# NUVIOR Prime — Implementation Plan

**Source of truth:** `docs/NUVIOR_PRIME_SPEC.md` (v2.1)  
**Related:** `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`

---

## 1. Spec analysis summary

### 1.1 Core user workflows

1. **Daily visit list generation** — province, start point, target, radius, min fit, visited list, revisits → geographically useful ranked list.
2. **Pre-visit clinic brief** — per account, seasonal pitch, questions, objections, ask, leave-behind, do-not-say.
3. **(Deferred) Research enrichment** — fill public data fields with evidence; unknown stays unknown.

### 1.2 Entities / data models

Taxonomy segments/categories, products, keyword bank, province scope rules, Account (+ public profile, internal status, people, evidence, qualification), VisitListRun/Item, PreVisitBrief.

### 1.3 External data dependencies

| Dependency | Needed for | Status |
|---|---|---|
| Google Places (or equivalent) | Discovery, geo, Place ID, ratings | Credentials required — mock in Phase 1 |
| Maps / Directions | True drive-time radius | Optional later; Phase 1 uses km haversine |
| Website / social research | Clinical profile, contacts, brands | Deferred — mock/UNKNOWN |
| LLM API | Brief prose polish | Deferred — template brief in Phase 1 |

### 1.4 Internal NUVIOR data dependencies

| Dependency | Fields | Status |
|---|---|---|
| academy.nuvior.com / CRM | Academy account, Aptos cert level & pathway, 4-level eligible staff, former Mesoestetic, last order, DNC | Mock CrmProvider until CRM access |
| Rep operational lists | Already visited, revisits due | Paste inputs in Phase 1 |

### 1.5 Qualification / scoring rules (from spec)

- Exact taxonomy labels only (§03).
- Fit score 1–5 with descriptive anchors (§06).
- Single recommended lead product from allowed set (§06).
- Certification pathway: 3-level (physicians, NPs) or 4-level (RNs, IMGs, NDs in BC, allied) (§01, §06).
- Scope filters for threads and PRP (§05).
- Exclude DNC, already visited, below min score, outside taxonomy (§02, §08).
- Include revisits labeled **RE-VISIT** (§02).
- Never recommend Mesoestetic as lead (§01, §08, §09).
- Former Mesoestetic → retention flag + Dermaceutic-led conversation (§08).

### 1.6 Compliance / business rules

- Do not invent addresses, phones, practitioners (§08).
- `UNKNOWN, verify` for gaps (§08).
- No patient information (§08, §09).
- Health Canada approved language in briefs; no guaranteed/permanent/cures (§09).
- No disparaging named competitor product comparisons in scripts (§09).
- Match thread conversations to provincial eligible practitioners (§05, §09).
- Thin inputs → say what to confirm on site (§09).

### 1.7 Features implementable now (no external credentials)

- App scaffold, schema, seeds (taxonomy, products, keywords, province rules).
- Prospect search input UI.
- Mock Places + mock CRM.
- Deterministic classification/scoring/exclusion engine.
- Daily visit list generation & display.
- Pre-visit brief **structure** + template generator.
- Unit tests for scoring, Mesoestetic ban, scope rules.

### 1.8 Features requiring external APIs / credentials

- Live Google Places discovery.
- Drive-time isochrones.
- Automated web/social research.
- Real CRM / academy sync.
- LLM-authored brief copy.
- Auth / production deploy.

---

## 2. Assumptions (explicit)

| ID | Assumption | Why |
|---|---|---|
| A1 | Phase 1 radius is great-circle km from geocoded start, not true drive time. | Spec allows “40 km, or 60 min drive”; drive-time needs Maps API. |
| A2 | Fit score uses a deterministic rubric inspired by §06 examples; the spec does not publish a full points matrix. | Needed for code; rubric documented below and in domain tests. |
| A3 | Mock clinic fixtures are synthetic engineering data, clearly sourced as `mock`, not real clinics. | Spec forbids inventing production clinic data; mocks are labeled. |
| A4 | Province SoP tables encode §05 principles; non-BC provinces mark ND as not eligible for threads unless later corrected by ops/legal. | Spec: NDs in BC where scope exists, not most other provinces. |
| A5 | RN thread eligibility treated as blocked for “lead with product” unless physician/NP on site or directive known; otherwise lead may be certification. | Spec: RNs generally only under physician order/directive. |
| A6 | List UI presents §07 sort (postal prefix, then fit desc) with distance available; generation still nearest-first. | Spec has both geographic method (§02) and table sort (§07). |
| A7 | No auth in Phase 1. | Explicitly deferred. |
| A8 | PostgreSQL via Docker Compose for local MVP. | Suggested stack. |
| A9 | Seasonal province UV adjustment is a **note** on brief, not a rewritten pitch calendar. | Spec gives qualitative guidance only. |
| A10 | “Allied professionals” for 4-level pathway follows spec wording; no expanded credential list invented. | Spec lists RNs, IMGs, NDs in BC, allied professionals. |

---

## 3. Unresolved dependencies

| ID | Dependency | Blocker for | Owner needed |
|---|---|---|---|
| U1 | Google Places API key | Live discovery | Ops / eng |
| U2 | CRM / academy.nuvior.com API or export | Real internal status | NUVIOR BDC / IT |
| U3 | Confirmed per-province injection scope matrix | Production SoP confidence | Compliance / medical affairs |
| U4 | LLM vendor + key | Narrative briefs | Eng |
| U5 | Auth provider (SSO?) | Multi-rep production | IT |
| U6 | Hosting target | Deploy | IT |
| U7 | Do-Not-Contact master list source | Auto-exclusion beyond mock | Sales ops |

---

## 4. Phased delivery

### Phase 1 — Local end-to-end MVP ✅ COMPLETE (2026-08-31)

**Goal:** Rep can submit search inputs → receive daily visit list from mock data → open brief structure for an account.

Deliverables:

- [x] Next.js + TypeScript + Tailwind scaffold
- [x] PostgreSQL + Prisma schema
- [x] Seed: taxonomy, products, keywords, province SoP rules, mock accounts/CRM
- [x] Prospect search input UI
- [x] `MockPlacesProvider` + `MockCrmProvider`
- [x] Deterministic qualification engine
- [x] Daily visit list output
- [x] Pre-visit brief data structure + template generator
- [x] Tests / typecheck / lint green
- [x] Local run instructions (`README.md`)

**Verified:**

- `npm run test` — 10/10 passed
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — success
- Seed: 6 segments, 45 categories, 5 products, 6 keyword banks, 26 scope rules, 17 mock accounts

**Out of scope (deferred):** Google Places, scraping, real CRM, auth, production deploy, LLM briefs.

### Phase 2 — Live Places discovery ✅ COMPLETE (2026-08-31)

**Goal:** Real pluggable Google Places discovery with mock retained; qualification unchanged.

Deliverables:

- [x] Pre-implementation audit (`docs/PHASE2_AUDIT.md`)
- [x] `RawPlace` without embedded NUVIOR taxonomy
- [x] `discoverPlaces` progressive rings + focused keyword queries + dedupe + budget
- [x] Deterministic `classifyPlace` (Google types = evidence only)
- [x] `GooglePlacesProvider` (Places API New + Geocoding)
- [x] `MockPlacesProvider` still default / fallback
- [x] Provenance on place fields + `PlacesApiCache`
- [x] `RoutingProvider` geodesic stub
- [x] UI discovery stats (provider, discovered, deduped, qualified, radius)
- [x] Toronto validation script
- [x] `docs/GOOGLE_PLACES_SETUP.md`
- [x] Tests (mock Google HTTP), typecheck, lint, build

**Assumptions added:**

| ID | Assumption |
|---|---|
| A11 | Text Search (New) with locationBias circle approximates “search outward”; not a true annulus-only search. |
| A12 | Classification rules are heuristic over name/types/signals; ambiguous → verify flag. |
| A13 | Without CRM, Google-only prospects use default credential signals (no invented practitioners). |

**Still unresolved:** U1 (production key + quota), U3 (SoP legal matrix).

### Phase 3 — Research enrichment + evidence ✅ COMPLETE (2026-08-31)

Deliverables:

- [x] `PHASE3_AUDIT.md`
- [x] `EnrichmentProvider` + `WebsiteEnrichmentProvider` + fixtures
- [x] Deterministic extractors (people, services, brands, contact)
- [x] Evidence aggregation + conflict handling
- [x] `WebsitePageCache` + extended `FieldEvidence` verification states
- [x] Qualification signal wiring (explicit only)
- [x] Verification queue UI + evidence inspector
- [x] Brief uses source-backed facts; unknowns → confirm prompts
- [x] Toronto capped enrichment validation
- [x] `docs/ENRICHMENT.md`, `docs/VERIFICATION_WORKFLOW.md`
- [x] Tests (mocked HTTP), lint, typecheck, build

**Out of scope:** CRM, auth, LLM, autonomous scraping, production deploy.

### Phase 4 — CRM integration + visit history

Deliverables:

- [x] `PHASE4_AUDIT.md`
- [x] Expanded pluggable `CrmProvider` + mock dataset
- [x] Deterministic matching + `CrmAccountMapping`
- [x] Ownership rules; central DNC; CRM revisit/visited merge
- [x] Certification / former Mesoestetic / last-order derived status
- [x] `VisitRecord` + visit-run snapshots
- [x] Dev CRM status panel, matching queue, visit form
- [x] `docs/CRM_INTEGRATION.md`, `ACCOUNT_MATCHING.md`, `VISIT_HISTORY.md`
- [x] Toronto validation with CRM overlay
- [x] Tests (no live CRM), lint, typecheck, build

**Out of scope:** Real CRM vendor adapter, auth, LLM, autonomous outreach, background jobs, production deploy.

### Phase 5 — Evidence-grounded LLM synthesis

Deliverables:

- [x] `PHASE5_AUDIT.md` + `LLM_SYNTHESIS.md`
- [x] Pluggable `LlmProvider` (`none` / `mock` / `openai`)
- [x] Locked facts + prompt/schema validation + safety scan
- [x] AI-assisted briefs, account summaries, question/objection tailoring
- [x] Visit-note structuring (suggestion only — no CRM auto-write)
- [x] `LlmResponseCache`, provenance (`generator` / `llmMeta`), template fallback
- [x] Evaluation tests without live API
- [x] Docs / README / env updates

**Out of scope (still deferred):** production deploy, drive-time, real CRM vendor, autonomous outreach, email/SMS, background agents, autonomous CRM writes, enterprise IdP.

### Phase 6 — Authentication, RBAC, audit

Deliverables:

- [x] `PHASE6_AUDIT.md` + auth/authorization/audit/security docs
- [x] Auth.js local credentials + middleware
- [x] User / AccountAssignment / AuditEvent models
- [x] Central permissions + territory gates
- [x] Server-side authorization on sensitive actions
- [x] Session-aware shell + admin users/audit UI
- [x] Seeded ON/AB rep, ON manager, national admin
- [x] `validate:auth` + leakage/permission tests

**Out of scope:** production deploy, drive-time, real CRM, outreach, enterprise SSO wiring.

### Phase 7 — Real CRM / data-source integration (read-only)

**Done (import path).** No live vendor API in-repo.

Deliverables:

- [x] `PHASE7_AUDIT.md` + CRM real-adapter / mapping / import / runbook docs
- [x] Staging `CrmSourceRecord` + `CanonicalCrmAccount` mirror
- [x] Normalization + multi-source precedence merge
- [x] `ImportCrmProvider` + fail-closed `api` / unknown modes (no silent mock fallback)
- [x] Fail-safe DNC (`dncVerified`), cert / Meso / last-order mapping
- [x] Dry-run import + Place ID backfill; `validate:crm`
- [x] Admin CRM diagnostics; territory filter on CRM reads for prospecting

**Out of scope:** invented vendor APIs, CRM writes, outreach, background sync agents, drive-time, production deploy.

### Phase 8 — Drive-time routing & visit-window feasibility

**Done.**

Deliverables:

- [x] `PHASE8_AUDIT.md` + `ROUTING.md` / `ROUTE_OPTIMIZATION.md` / `ROUTING_RUNBOOK.md`
- [x] Pluggable `geodesic` / `mock` / `google` (Routes API matrix) routing
- [x] Travel matrix + cache + API budgets
- [x] Max radius + max drive minutes; workday / visit duration / lunch
- [x] Deterministic utility optimizer (fit / revisit / travel / schedule)
- [x] Opening-hours feasibility + suggested drop-in window
- [x] Immutable route snapshots; route summary UI
- [x] `validate:routing` (mock + geodesic)

**Out of scope:** production deploy, IdP, outreach, CRM write-back, map SDK as blocker.

### Phase 8.5 — Visual redesign

**Done.** High-end B2B SaaS UI: design tokens, app shell, map-first Today's
Route, planner panel, itinerary timeline, clinic drawer, pre-visit brief card.
See `DESIGN_SYSTEM.md`.

### Phase 8.6 — Google Maps Platform migration

**Done.**

- [x] Production map = Google Maps JavaScript API (`@vis.gl/react-google-maps`,
      Advanced Markers, Map ID styling); Leaflet is emergency fallback only
- [x] Places autocomplete start search (session tokens, debounced) with Place
      ID / address-component retention
- [x] Start modes: search, user-initiated geolocation, drop pin
- [x] Real road geometry via Routes `computeRoutes` (segmented ≤ 25
      intermediates, cached, budgeted) with honest schematic fallback
- [x] Drawn working-area polygon (draw/edit/clear) wired as a discovery
      constraint (candidates outside excluded pre-qualification)
- [x] Browser/server key separation (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` /
      `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY` vs
      `GOOGLE_MAPS_SERVER_KEY` / `GOOGLE_PLACES_API_KEY` /
      `GOOGLE_ROUTES_API_KEY`), unit-tested
- [x] Renderer priority live → demo → fallback; chips Google Live / Google Demo
      / Mock Routing / Fallback Map
- [x] `GOOGLE_MAPS_SETUP.md`, `ROUTE_MAP_UX.md`

### Phase 8.7 — Map UX polish

**Done** (Google map path unchanged; Leaflet is emergency fallback only).

Live Google validation remains **`PENDING_GOOGLE_CREDENTIALS`**. Do not invent
keys. When credentials exist, run the checklist in `GOOGLE_MAPS_SETUP.md` as
a separate pass — no architecture change required.

- [x] Marker design: hover, selected ring, staggered entrance, reduced-motion
- [x] Route styling: road casing vs honest dotted schematic
- [x] Map/list choreography: bidirectional hover, scroll-into-view, pan
- [x] Draw-area UX: live fill, close-on-first-vertex, km², Esc/Enter
- [x] Mobile clinic bottom sheet: grab handle, swipe-to-dismiss
- [x] Route loading overlay + itinerary skeleton
- [x] Manual reorder/remove overlay (snapshot untouched; times/geometry hidden)

### Phase 8.8 — Map-first planning UX

**Done** (mock/dev; Google production path unchanged).

Live Google validation remains **`PENDING_GOOGLE_CREDENTIALS`**.

- [x] Today opens as a map-first workspace (no giant prospecting form)
- [x] Start: Use my location / Search / Drop pin → canonical `StartSelection`
- [x] Province inferred from place / postal / coords; territory rejection without silent switch
- [x] Auto travel reach 30/45/60 wired to `maxDriveMinutes` (no fake isochrone)
- [x] Draw Today’s area as first-class constraint + validation
- [x] Compact day controls (12-hour clocks) + BUILD MY DAY
- [x] Same-map pipeline overlay → itinerary; Edit plan / stale / rebuild preserves prior route
- [x] Candidate layer from qualified pool (no DNC)
- [x] `docs/MAP_FIRST_PLANNING.md`
- [x] PlanningArea (DRIVE_TIME / DRAWN_AREA / RADIUS) + Plan somewhere else
- [x] Session memory for planner inputs; due-revisit-outside-polygon policy documented

---

## 5. Phase 1 scoring rubric (assumption A2)

Deterministic inputs only (from mock/CRM/classification):

| Signal | Effect |
|---|---|
| Segment 1 | +2 base |
| Segment 2–3 | +1 base |
| Segment 4 | +0 base |
| Segment 5–6 | −1 base (still in taxonomy; often lower fit) |
| Physician/NP injector present | +1 |
| Advertises threads, no Aptos/cert | +1 |
| Premium positioning | +1 |
| Former Mesoestetic (retention via Dermaceutic) | +1 toward Dermaceutic path, not Mesoestetic |
| Do-Not-Contact | exclude (no score on list) |
| Scope blocks all injectable leads and no skincare angle | cap ≤ 2 |

Clamp to 1–5. Lead product selection:

1. If former Mesoestetic → prefer **Dermaceutic** (never Mesoestetic).
2. Else if thread-eligible + thread angle → **Aptos** or certification pathway product if staff need training.
3. Else if PRP-eligible Segment 2 / hair → **Fidia Hy-tissue PRP**.
4. Else if skincare/peels angle → **Dermaceutic**.
5. Else retail/spa → **GESKE**.
6. Certification lead when injectable interest but no eligible placer yet.

---

## 6. Phase 1 progress tracker

| Item | Status |
|---|---|
| Spec read & analysis | Done |
| ARCHITECTURE.md | Done |
| DATA_MODEL.md | Done |
| IMPLEMENTATION_PLAN.md | Done |
| App scaffold | Done |
| DB schema + seed | Done |
| Qualification engine | Done |
| UI + mock providers | Done |
| Brief structure | Done |
| Tests / lint / typecheck | Done |
| Local MVP verified | Done |

---

## 7. Remaining work (post–Phase 8.8)

1. Wire live NUVIOR CRM/academy/orders API when U2 schema/credentials exist.
2. Enterprise IdP (U10–U12) replacing local credentials.
3. Production deploy + ops hardening / observability.
4. Systematic FieldEvidence persistence from enrichment UI.
5. Compliance review of SoP tables (U3).
6. Optional OpenAI brief pilot under authenticated roles.
7. Controlled CRM write-back / outreach (later phases).
8. Live Google Maps validation when credentials exist — **`PENDING_GOOGLE_CREDENTIALS`**.
   Run the checklist in `GOOGLE_MAPS_SETUP.md`; no architecture change expected.
9. Saved working-area presets (Downtown Toronto / North York / …) — placeholder only in 8.8.
10. True drive-time isochrone polygons when a provider exists (travel reach is a
    `maxDriveMinutes` constraint today, not a drawn road boundary).

---

## 9. Product gap intelligence (Stage A–E)

See `docs/PRODUCT_GAP_AUDIT.md`, `docs/ODOO_PRODUCT_CATALOG.md`, `docs/PRODUCT_GAP_ENGINE.md`, and `docs/PRODUCT_OPPORTUNITY_SCORING.md`.

| Stage | Status | Deliverable |
| --- | --- | --- |
| A | Complete | Architecture audit |
| B | Complete | `ProductCatalogProvider`, `NuviorProduct`, mock catalog, eligibility |
| C | Complete | `ClinicCapabilityProfile`, `ResearchProvider`, Claude/mock extraction |
| D | Complete | Deterministic `ProductGapEngine`, `ProductGapAnalysis`, adjacency rules |
| E | Complete | `ProductOpportunityAnalysis`, scoring v1.0.0, primary selection, persistence |
| F | Planned | Clinic UI + pre-visit brief integration |

Phase 1–8 qualification (`LeadProductCode`, fit score) unchanged.

---

## 8. How to test locally

```bash
npm install && npm run db:up && npm run db:setup
PLACES_PROVIDER=mock ENRICHMENT_MAX_ACCOUNTS=5 npm run validate:toronto
npm run validate:crm
PLACES_PROVIDER=mock CRM_PROVIDER=mock npm run dev
```

See `docs/ENRICHMENT.md`, `docs/CRM_RUNBOOK.md`, and `docs/GOOGLE_PLACES_SETUP.md`.
