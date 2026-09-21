# Clinic Capability Profile (Stage C)

Structured, evidence-backed inventory of what a clinic **publicly appears** to offer. Used by future gap analysis — not a product recommendation.

## Model: `ClinicCapabilityProfile`

| Field | Purpose |
| --- | --- |
| `clinicId` | Account / research key |
| `researchedAt` | ISO timestamp |
| `researchStatus` | Workflow status |
| `sourceVersion` | Hash of reviewed pages + prompt version |
| `provider` / `model` / `promptVersion` | Provenance |
| `capabilityTaxonomyVersion` | Stage B taxonomy version used |
| `reviewedPageUrls` | Pages included in research |
| `services[]` | Normalized services |
| `capabilities[]` | Capability tags + states |
| `brands[]` | Explicitly named brands |
| `devices[]` | Named devices/platforms |
| `practitioners[]` | Named practitioners |
| `practitionerTypes[]` | MD, NP, RN, aesthetician, etc. |
| `clinicalFocusAreas[]` | Stated focus areas |
| `ambiguities[]` | Topics needing clarification |
| `unknowns[]` | Insufficient data notes |
| `evidenceRefs[]` | Shared evidence registry |
| `reconciliationNotes[]` | Deterministic vs research notes |

## ProfileItem

Each item includes:

- `normalizedValue`, optional `rawSourceWording`
- `capabilityTag` (capabilities only)
- `inventoryState`, `confidence`
- `evidenceRefIds` (required for `CONFIRMED_PRESENT`)
- `reviewedScope` (for `NOT_FOUND`)
- `fromDeterministicExtractor`, `conflictWithDeterministic`

## Research statuses

| Status | Meaning |
| --- | --- |
| `NOT_RESEARCHED` | No run yet |
| `RESEARCHING` | In progress (future UI) |
| `RESEARCHED` | Complete |
| `NEEDS_VERIFICATION` | Conflicts or ambiguities |
| `STALE` | Source/prompt changed |
| `FAILED` | Provider/validation failure |

## Evidence rules

1. No evidence → not `CONFIRMED_PRESENT`
2. Every evidence ref has snippet, source URL (nullable), confidence
3. `NOT_FOUND` never implies clinic-wide absence
4. Stage C emits **no** product recommendations

## Persistence

Prisma: `ClinicResearchProfile` (`profileJson` stores full profile).

Access: `src/lib/researchPersistence.ts`

## Workflow API

```typescript
import { buildResearchContext, runClinicResearch } from "@/domain/research";
import { getResearchProvider } from "@/providers/research";

const ctx = buildResearchContext({ ... });
const result = await runClinicResearch(getResearchProvider(), ctx);
```

## Mock fixtures

`src/providers/research/mockResearchFixtures.ts` — nine scenarios for validation and future Stage D tests.

## Stage boundaries

| Stage | Scope |
| --- | --- |
| C (this) | Extract clinic capabilities |
| D (next) | Compare profile vs NUVIOR catalog |
| E | Opportunity scoring |
| F | UI + brief integration |
