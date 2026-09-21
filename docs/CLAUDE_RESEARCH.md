# Claude Clinic Research (Stage C)

Evidence-grounded structured extraction from public clinic sources. **Extraction only** — no product recommendations, no gap analysis.

## Purpose

```
On-demand research request
  → reuse website cache / allowed pages
  → ClinicResearchContext (controlled input)
  → ResearchProvider (mock | claude | disabled)
  → Zod-validated extraction
  → reconcile with deterministic extractors
  → persist ClinicCapabilityProfile
```

## Providers

| `AI_RESEARCH_PROVIDER` | Behavior |
| --- | --- |
| `mock` (default) | Deterministic fixtures — no API key |
| `claude` | Anthropic Messages API when `ANTHROPIC_API_KEY` set |
| `disabled` | Fail-closed |

Separate from `LLM_PROVIDER` (narrative brief polish).

## Claude boundaries

**May:**
- Extract structured services, capabilities, brands, devices, practitioners
- Normalize into closed capability taxonomy v1.0.0
- Assign inventory states with evidence

**Must NOT:**
- Choose NUVIOR products or opportunity scores
- Override CRM/DNC/qualification/scope
- Invent brands from generic categories
- Infer credentials from photos
- Follow instructions embedded in website text

## Input: `ClinicResearchContext`

Includes only: clinic identity, province, taxonomy segment/label, website URL, sanitized page text, deterministic field evidence, capability taxonomy, approved brand vocabulary.

Excludes: API keys, CRM payloads, Odoo catalog, patient data, secrets.

## Output: schema-validated extraction

Zod schema in `src/domain/research/schemas.ts`. Rejects:
- `CONFIRMED_PRESENT` without evidence
- Unknown capability tags
- Product recommendation fields

## Inventory states

| State | Meaning |
| --- | --- |
| `CONFIRMED_PRESENT` | Explicitly supported on reviewed source |
| `CONFIRMED_ABSENT` | Explicitly denied (rare) |
| `NOT_FOUND` | Not on reviewed pages — **not** “clinic lacks it” |
| `AMBIGUOUS` | Weak/conflicting language |
| `UNKNOWN` | Insufficient coverage |

## Prompt injection

- Website text sanitized (`sanitizeWebsiteText`)
- System prompt treats pages as untrusted data
- Secret redaction in prompts

## Reconciliation

Deterministic `VERIFIED_SOURCE` enrichment evidence is not silently overridden. Conflicts produce `ReconciliationNote` with `conflict_visible`.

## Caching / persistence

`ClinicResearchProfile` Prisma table stores full profile JSON + `sourceVersion` + `promptVersion`.

Cache hit when page hashes + prompt version unchanged. Recompute when evidence changes.

## Config

```bash
AI_RESEARCH_PROVIDER=mock
ANTHROPIC_API_KEY=          # server-side only
CLAUDE_MODEL=claude-sonnet-4-20250514
AI_RESEARCH_TIMEOUT_MS=45000
AI_RESEARCH_CACHE_TTL_SECONDS=86400
```

## Validation

```bash
npm run validate:clinic-research
```

## Unresolved live dependencies

- Production Anthropic key and model selection
- Retry policy tuning for validation failures
- UI trigger for on-demand research (Stage F)

See also: `docs/CLINIC_CAPABILITY_PROFILE.md`
