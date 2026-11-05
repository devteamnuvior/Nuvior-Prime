# Clinic Contact Research (Claude web search)

On-demand lookup of a clinic's **public contact and identity facts** using Claude with
server-side web search and web fetch. Separate from Stage C clinic research
(`docs/CLAUDE_RESEARCH.md`), which extracts capabilities from already-fetched website pages.

## What it answers

For one clinic on the Today route: address, phone numbers, public emails, official website,
social profiles, leadership roles (owner, clinic manager, medical director, lead injector),
opening hours, services listed on the clinic's own site, the **products, brands and devices the
clinic itself publishes** (injectable brands, lasers and energy devices, skincare lines, named
treatment systems — each with a kind and the page it appears on; added in prompt v2, 2026-11-05),
and a short factual website summary.

Every fact carries the `sourceUrl` it was read from. Facts without a source are rejected by the
schema. Anything not found is listed under `unknowns`, never guessed.

## What it never does

- Recommend products, score fit, or judge opportunity (schema rejects such keys). Listing what
  the clinic publishes it uses is allowed; inferring a brand from a treatment name is not.
- Override CRM, DNC, qualification, or scope rules.
- Collect personal data beyond names and professional roles.
- Follow instructions embedded in web pages (treated as untrusted data).

## Flow

```
ClinicDrawer → "Find clinic info with Claude"
  → runClinicWebProfileAction (auth: brief.generate + province + account access)
  → ClinicProfileProvider (claude | mock | disabled)
  → Claude: web_search + web_fetch → one JSON object
  → Zod validation (src/domain/clinicProfile/schema.ts)
  → persisted in ClinicWebProfile (one row per clinic)
  → ClinicWebProfileSection renders facts with source links
```

Selecting a stop reads the cached row only. The provider runs only when the rep clicks the
button or Refresh, because each run spends API calls.

## Providers

| `CLINIC_PROFILE_PROVIDER` | Behavior |
| --- | --- |
| unset | `claude` when `ANTHROPIC_API_KEY` is set, otherwise `mock` |
| `claude` | Anthropic Messages API via `@anthropic-ai/sdk`, fails (no fallback) without a key |
| `mock` | Deterministic fixture, clearly labelled "Mock data" in the UI |
| `disabled` | Button disabled, no calls |

## Claude request shape

- Model: `CLAUDE_MODEL`, default `claude-opus-5-5`.
- Tools: `web_search_20260209` (capped by `CLINIC_PROFILE_MAX_SEARCHES`, located to the clinic's
  province/city) and `web_fetch_20260209` (capped by `CLINIC_PROFILE_MAX_FETCHES`).
- `pause_turn` is resumed by handing the partial assistant turn back, up to 8 turns.
- Server-side refusal fallback is enabled (`fallbacks: "default"`); a final `refusal` stop
  reason surfaces as a failed research with the category.
- The reply is parsed as JSON (fenced or bare) and validated; prompts strip secrets.

## Config

```bash
ANTHROPIC_API_KEY=              # server-side only, never commit
CLAUDE_MODEL=claude-opus-5-5
CLINIC_PROFILE_PROVIDER=        # claude | mock | disabled
CLINIC_PROFILE_TIMEOUT_MS=180000
CLINIC_PROFILE_MAX_SEARCHES=8
CLINIC_PROFILE_MAX_FETCHES=6
CLINIC_PROFILE_CACHE_TTL_SECONDS=604800   # older rows show "May be outdated"
```

On Vercel, add `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`) to the project's environment
variables and redeploy. Run `npm run db:push` (or `prisma db push`) against the hosted database
once to create the `ClinicWebProfile` table.

## Validation

```bash
npx vitest run src/providers/clinicProfile
```

Tests cover the mock provider, factory selection, schema rejection of recommendation fields and
unknown keys, JSON extraction, and prompt safety text. Live Claude calls are not exercised in tests.

## Notes on mock accounts

With `PLACES_PROVIDER=mock`, route stops are fictional ("Mock Queen West MedSpa"). Claude will
report `matchConfidence: LOW` and mostly `unknowns` for them, which is the correct behavior.
Real results need real accounts from Google Places.
