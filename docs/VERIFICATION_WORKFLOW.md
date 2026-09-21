# Verification workflow — Phase 3

Internal/dev workflow for fields that need human confirmation before reps trust them.

## When items are queued

- `CONFLICT` — multiple incompatible evidence values
- `AMBIGUOUS` — weak extraction (e.g. lift without thread terms)
- `UNKNOWN` — no public source
- `MANUAL_VERIFY` — e.g. no MD/NP named; taxonomy low confidence
- `DERIVED` service roll-ups may also be listed for confirmation

## UI

After generating a visit list:

1. **Verification queue (dev)** panel — filter by account, field, status, source
2. Open **Brief** on a row → **Field provenance** + **Evidence inspector**
   - value, verification state, source type/URL, snippet

Rep-facing visit table stays concise (fit, lead, opening angle).

## Status meanings

See `docs/ENRICHMENT.md` evidence states.

## What reps should do

Treat `UNKNOWN, verify` / queue items as on-site confirmation prompts.  
Do not invent practitioners, brands, or thread offerings.

## Auth

Not required in Phase 3. Phase 4+ may add SSO and persisted review states.
