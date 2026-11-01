# NUVIOR Prime — Design System

Status: v2 (MUI dashboard). Implemented in `src/theme/tokens.ts` (design tokens),
`src/theme/theme.ts` (MUI theme: light palette, spacing, radius, shadows,
typography, component defaults), `src/theme/ThemeRegistry.tsx` (Emotion cache + providers),
`src/components/layout/*` (dashboard shell), `src/components/data-table/DataTable.tsx`
(MUI X DataGrid wrapper) and `src/components/feedback/*` (KPI cards, chips, empty states,
dialogs, drawers, toasts).

Personality: premium, clinical, calm, precise. European-medical rather than Silicon Valley SaaS.
No gradients, no glassmorphism, no illustration beyond the quiet empty-state marks, minimal
colour. The route and the day are the product; chrome stays quiet.

---

## 0. Stack and rules (v2)

- **Framework:** Material UI v9 (`@mui/material`) with Emotion, MUI X DataGrid (community),
  `@mui/icons-material` (Outlined set), `notistack` for toasts, `react-hook-form` + `zod` for
  forms, `nextjs-toploader` for the route progress bar.
- **Single source of truth:** every colour, radius, shadow, duration and font comes from
  `src/theme/tokens.ts` through the MUI theme. Components read `theme` / `sx` tokens
  (`primary.main`, `background.sunken`, `text.faint`, `divider`, `theme.shadows[1..3]`) and never
  hardcode values. The theme emits CSS variables prefixed `--nv-` (e.g.
  `--nv-palette-primary-main`); `src/app/globals.css` only aliases the v1 names onto them for the
  Tailwind-based map workspace (`src/components/today/*`), which is unchanged in v2.
- **Light mode only.** There is no dark scheme and no theme switcher; never add
  `theme.applyStyles("dark")` or `.dark &` styles.
- **No custom CSS.** Styling goes through MUI components, `sx` and the theme. The only
  stylesheet left is the v1-token bridge + map marker CSS in `src/app/globals.css`, which is
  removed when the Today workspace finishes its MUI migration (markers move to `GlobalStyles`).
- **Spacing:** 4px grid (`theme.spacing(1) === 4px`). **Radius:** 6 / 8 / 12 / 16 (sm / md / lg / xl),
  8px default. **Elevation:** three levels only — `shadows[1]` resting card, `[2]` floating
  menu/popover, `[3]` dialog/drawer. Borders do most of the separation work.
- **Typography:** Inter. Exactly four headings: h1 24/600, h2 20/600, h3 16/600, h4 14/600.
  body1 14, body2 13, caption 12, `eyebrow` (custom variant) 11/600 uppercase tracked. h5/h6 are
  disabled. Serif (Fraunces italic) is reserved for the "N" monogram and the login greeting.
  Mono (IBM Plex Mono) for ids, emails in tables and diagnostics only.
- **Motion:** 150 / 200 / 250 ms (`transitions.duration`), one ease curve. Respect
  `prefers-reduced-motion` for the map (see §1.6).
- **Accessibility:** every icon-only control has `aria-label`; focus-visible rings use
  `primary.main`; status is never colour-only (chips carry text); tables expose `aria-label`,
  sortable headers and keyboard navigation via DataGrid.

### Dashboard shell (`src/components/layout`)

- `AppShell` (server) resolves the session, filters `nav.ts` by permission and renders
  `DashboardShell` (client): collapsible mini-variant `Drawer` (240 → 64 px, state in the
  `nv-sidebar` cookie, `[` toggles), active route highlighted with a 2px primary bar, nested
  Admin links, temporary drawer below `md`.
- `Header`: breadcrumbs from `ROUTE_LABELS`, territory chip, `CommandSearch` (⌘K page palette),
  `UserMenu` (role, territory, sign out).
- Pages render `PageContainer` + `PageHeader`; `loading.tsx` files render `PageSkeleton` /
  `TableSkeleton`. The Today route is full-bleed and bypasses `PageContainer`.

### Reusable components

| Component | File | Notes |
| --- | --- | --- |
| `DataTable` | `components/data-table/DataTable.tsx` | DataGrid wrapper: quick search, column filters/visibility, sorting, pagination (10/25/50/100), optional checkbox selection + bulk actions, sticky header, loading / empty / error overlays, `actionsColumn()` helper for per-row menus. |
| `KpiCard`, `KpiGrid` | `components/feedback/KpiCard.tsx` | Label, value, optional % delta with trend icon, tone, icon. |
| `StatusChip`, `CodeChip` | `components/feedback/StatusChip.tsx` | Soft tonal status pill with dot; mono code chip. |
| `EmptyState` | `components/feedback/EmptyState.tsx` | Token-coloured illustration, title, hint, action. |
| `ConfirmDialog` | `components/feedback/ConfirmDialog.tsx` | Destructive confirmations. |
| `SideDrawer` | `components/feedback/SideDrawer.tsx` | Right panel with header / scroll body / sticky footer. |
| `toast` | `components/feedback/toast.ts` | `toast.success/error/info/warning/result()` via notistack. |
| `FormTextField`, `FormSelect`, `FormCheckbox`, `FormSwitch` | `components/form/fields.tsx` | react-hook-form bindings; errors render as helper text under the field. |

---

## 1. Foundations (v1 tokens — still the palette behind v2)

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
