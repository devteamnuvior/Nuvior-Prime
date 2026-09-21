# NUVIOR Prime — Design System

Status: v1 (UI redesign). Implemented in `src/app/globals.css` (tokens), `src/app/layout.tsx`
(typefaces), `src/components/AppShell.tsx` (shell), and `src/components/today/*` (route surface).

Personality: premium, clinical, calm, precise. European-medical rather than Silicon Valley SaaS.
No gradients, no glassmorphism, no illustration, minimal color. The route and the day are the
product; chrome stays quiet.

---

## 1. Foundations

### 1.1 Color tokens

Defined as CSS custom properties and mapped into Tailwind v4 via `@theme inline`
(`bg-paper`, `text-ink`, `border-rule`, `bg-accent-tint`, …).

| Token | Value | Usage |
| --- | --- | --- |
| `--paper` | `#FAF9F6` | App background (warm white) |
| `--canvas` | `#F1EFE9` | Recessed wells, map backdrop, hover fills |
| `--panel` | `#FFFFFF` | Raised cards, sidebar, drawers |
| `--ink-surface` | `#16211F` | Inverse surface: start marker, monogram, selected pin |
| `--ink` | `#191C1C` | Primary text |
| `--muted` | `#6B7273` | Secondary text |
| `--faint` | `#9AA1A0` | Tertiary text, placeholders, section eyebrows |
| `--rule` | `#E2DFD6` | Standard 1px borders |
| `--rule-soft` | `#EDEBE3` | Hairline dividers |
| `--accent` | `#14594F` | Muted medical teal — primary actions, fit badges, markers |
| `--accent-hover` | `#0F4A42` | Accent hover |
| `--accent-tint` | `#E9EFEC` | Accent washes, selected-stop fill, lead-product hero |
| `--signal` | `#8A5A1C` | Warm amber — revisit, verify, caution |
| `--signal-tint` | `#F6EFE1` | Signal washes |
| `--danger` | `#9C3A2C` | Errors, "Do not say" |
| `--danger-tint` | `#F7EAE7` | Error washes |

Rules: never use bright cyan; color always carries meaning (accent = action/quality,
signal = attention, danger = stop). Neutral chrome is otherwise achromatic-warm.

### 1.2 Typography

| Role | Face | Notes |
| --- | --- | --- |
| UI / operational | Inter (400/500/600/700) | Everything: nav, forms, itinerary, data |
| Brand serif | Fraunces italic | Monogram "N" only — never body copy |
| Mono | IBM Plex Mono | Dev/diagnostic panels only, never rep-facing data |

Scale (implemented sizes): page title 15px/600; card title 14px/600 (`text-sm font-semibold`);
body 13–13.5px/400; secondary 12px (`text-xs`); section eyebrows 10.5px/600, uppercase,
tracking `0.16em`, `--faint`; metrics 13px with 600 value + 400 muted label.

### 1.3 Spacing, radius, elevation

- Spacing: Tailwind 4px grid. Card padding 14–20px; panel gutters 16px (mobile) / 24px (desktop).
- Radius: controls & badges 6–8px (`rounded-md/lg`), floating panels 12px (`rounded-xl`),
  mobile sheets 16px top (`rounded-t-2xl`). No oversized pill cards.
- Elevation: `--shadow-card` (subtle, resting cards), `--shadow-float` (floating panels over the
  map), `--shadow-sheet` (bottom sheets). Borders do most of the separation work; shadows are quiet.

### 1.4 Controls

- Inputs/selects: height 40px (`h-10`), `rounded-lg border-rule bg-paper`, 13–14px text.
- Primary button: `bg-accent` white text, 600 weight; hero CTA ("Build today's route") is 48px
  tall, uppercase, letterspaced.
- Secondary button: `border-rule bg-panel`, hover `bg-canvas`.
- Segmented control (min fit): 5 cells, 40px tall, selected cell `bg-accent text-white`.
- Touch targets ≥ 40px everywhere; ≥ 44px for field-critical actions (drawer CTAs are 44px).

### 1.5 Badges

`Badge` (in `src/components/today/Itinerary.tsx`): 11px medium, 6px/2px padding, 4px radius.

| Tone | Style | Meaning |
| --- | --- | --- |
| accent | accent-tint / accent | Fit score, VERIFIED |
| neutral | canvas / ink | Lead product |
| signal | signal-tint / signal | Revisit, opening warnings, VERIFY |
| outline | rule border / muted | Unknown hours, low-emphasis flags |
| danger | danger-tint / danger | DNC-class information |

Provenance chips (VERIFIED / INTERNAL / DERIVED / VERIFY) are 10px uppercase micro-labels —
visually subtle, conclusion first; full evidence lives behind the drawer's "Details" disclosure.

### 1.6 Route markers (`.nv-pin` in globals.css)

- Stop: 28px circle, `--accent`, white 2px ring, white stop number — matches itinerary numbers.
- Revisit stop: same, `--signal`.
- Opening warning: 10px `--signal` badge at top-right (not an extra ring).
- Hover (list or map): scale 1.16×.
- Selected: scales 1.32×, `--ink-surface`, one-shot expanding accent ring.
- Start: 26px, `--ink-surface`, "S".
- Entrance: calm fade when a route arrives; Stop 01 gets a one-shot arrival
  scale. Disabled under `prefers-reduced-motion`.
- START: slow halo (`nv-pin__halo`), not a radar sweep.
- Route hierarchy: active leg is a 4px solid stroke with a thin cream
  casing and a restrained 3-stop dark→open wash; future/completed legs are
  thinner and quieter. No moving orbs. Tokens in `src/lib/motion.ts`.
- Road geometry: real Routes polyline, never mathematically bent off-road.
- Schematic fallback: a straight two-point segment between stops, captioned as mock.

---

## 2. Application shell

- Left sidebar, fixed 224px, `bg-panel`, 1px right rule. Brand row ≈ 56px (monogram + wordmark).
- Primary nav: Today, Prospecting, Visit History. "Management" group (permission-gated):
  Team, Verification, Matching, Admin. Items 36px tall, 13px/500, 15px stroke icons.
- Sidebar footer: signed-in name, role · territory, sign out.
- Top bar: 56px, sticky, `bg-paper` with bottom rule — page title, weekday + date, territory chip
  (pill, right-aligned). Compact by design; no breadcrumbs.
- < 768px: sidebar collapses to a horizontal scrolling nav row under the top bar; content is
  full-width.

## 3. Screens

### 3.1 Today's Route (`/`)

Layout (desktop): action bar → optional summary strip → map (~65%) + planner /
itinerary (~34%, own scroll). See `MAP_FIRST_PLANNING.md`.

- **Action bar**: “Where do you want to work today?” until a route exists;
  then stop count. **Edit plan** / **Rebuild route** when a route is live or
  stale. Mode chips: Google Live / Google Demo / Mock Routing / Fallback Map
  (hidden only when the session is fully live).
- **Summary strip**: `18 / 20 visits · 2h 34m driving · 41.6 km · 6h 45m planned · Finish 4:35 PM`
  — 13px, values 600. Right side: status pills (Traffic aware, Google/Mock/Geodesic routing,
  "Drive times estimated" when geodesic fallback, "N stops need verification", "Drive limit not
  verified"). Signal-toned pills only when true.
- **Map**: Google Maps (live or Demo Key). Leaflet/CARTO only if neither key
  exists (**Fallback map — not Google**). Demo is badged **Google Demo — not production**.
  START marker, numbered stops, subordinate candidate dots, road polyline when
  Google geometry exists else dotted schematic. Controls stacked top-right.
- **Planner / itinerary**: before a route, compact start → area → day controls
  and **BUILD MY DAY**. After a route, the same panel becomes the itinerary
  timeline (START node, travel legs, stop cards). CRM fields do not appear.
- **Diagnostics** (collapsed, bottom of panel): pipeline stats, routing warnings, not-routed
  reasons, DNC exclusions, matching + verification queues. Manager-oriented, out of the rep flow.

### 3.2 Today's Route — empty

Map is the canvas immediately. Compact start chooser: Use my location, Search
location, Drop pin. No giant empty form.

### 3.3 Route planning controls

Side panel (~34%) on desktop; bottom sheet on mobile. Grouped: **Start** →
**Today’s area** (travel reach 30/45/60 or draw) → **Day** (12-hour start/end,
target visits, min fit). Advanced (radius, max drive, visited / revisits)
collapsed by default. CTA: full-width 48px **BUILD MY DAY**. Pending state
stays on the map (staged overlay); errors render inside the panel.

### 3.4 Selected clinic drawer

Trigger: marker or itinerary tap. Desktop: 370px card floating bottom-left over the map;
mobile: bottom sheet (≤72dvh, grab handle). Content order: identity (number pin, name,
category/segment/org type, address) → badges (fit, lead product, revisit, verify) →
**Why this stop** (deterministic route reasons) → **Arrival & opening** (planned window, hours
label, suggested drop-in window) → **Signals** (VERIFIED/VERIFY chips, max 3 each) →
**NUVIOR relationship** (status, Aptos, ordering, last visit, revisit due — or "unverified" /
"no internal record"). Primary CTA "View pre-visit brief" (44px), secondary "Open in Google
Maps". Raw provenance, CRM table, evidence and the visit log live behind "Details".

### 3.5 Pre-visit brief

Modal (max-w 672px, sheet on mobile) styled as a field briefing card. Header: eyebrow
"PRE-VISIT BRIEF", clinic name, visit type · arrival · category · province, then the lead-product
hero (accent-tint band, product name 15px/600, Fit badge). Sections in reading order:
Why we're here → What we know (AI summary, labelled non-authoritative) → Confirm on site
(signal wash) → Opening (primary line quoted in a bordered card; other lines behind a
disclosure) → Questions to ask (numbered chips) → Signals to look for → Likely objections
(objection italic muted, response beneath) → The ask (+ leave-behind, second product) →
Do not say (danger ✕ list). Footer: season, UV note, generator metadata in 11px faint.

### 3.6 Secondary screens

- **Visit History**: two card columns — planned routes (date, province, stops/target, start,
  driving) and logged visits (account, date, type, outcome, next action).
- **Accounts**: searchable card list; name + verify chip, category/segment, address; right side
  Fit and lead product badges + Maps link. Province-scoped server-side.
- **Verification**: persisted evidence flagged `needsVerification`, field → value with VERIFY
  chip, source link; run-scoped items surface in Today → Run diagnostics.
- **Matching / Team / Admin / CRM diagnostics**: retain existing structure; inherit tokens and
  the shell (titles moved to the top bar).

## 4. States

- **Loading**: map overlay card with spinner + "Building today's route…"; map itself shows an
  animated `bg-canvas` pulse while Maps JS (or the Leaflet fallback) loads.
- **Empty**: see 3.2; list pages use dashed-border quiet notes with a pointer to the next action.
- **Error**: danger wash inside the planner (validation/auth) or a slim danger banner under the
  action bar when the planner is closed.
- **Warning**: signal pills/badges — never red; red is reserved for errors and "do not" content.
- **Honesty states**: geodesic legs are labelled "est."; the summary shows "Drive times
  estimated" and "Drive limit not verified" whenever real drive times are unavailable.

## 5. Responsive behavior

- ≥1024px: side-by-side map/itinerary as above.
- 768–1023px: map 46dvh on top, itinerary below full-width; planner still floats over the map.
- <768px: horizontal nav row; planner and clinic drawer become sheets; brief opens as a
  bottom-aligned sheet. All tap targets ≥40px; drawer/brief CTAs 44px.

## 6. Do / don't

- Do keep the map clear; at most one floating panel per corner.
- Do show conclusions first, provenance behind "Details" / "View evidence".
- Don't use monospace for rep-facing data (dev diagnostics only).
- Don't introduce new colors; extend meaning through the four tonal families.
- Don't present geodesic estimates as drive times anywhere in the UI.
