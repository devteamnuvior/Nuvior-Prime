#!/usr/bin/env tsx
/**
 * validate:clinic-research — mock fixtures only, no live Claude credentials.
 */

import { buildResearchContext } from "../src/domain/research/buildContext";
import { runClinicResearch } from "../src/domain/research/runResearch";
import { validateResearchEnv } from "../src/lib/researchConfig";
import { MockResearchProvider } from "../src/providers/research/mockResearchProvider";
import { MOCK_RESEARCH_FIXTURE_IDS } from "../src/providers/research/mockResearchFixtures";

async function main() {
  const env = validateResearchEnv();
  console.log("Clinic research validation (mock fixtures)\n");
  console.log("  AI_RESEARCH_PROVIDER:", process.env.AI_RESEARCH_PROVIDER ?? "mock (default)");

  if (env.warnings.length) {
    console.log("\nWarnings:");
    for (const w of env.warnings) console.log("  -", w);
  }
  if (env.errors.length) {
    console.log("\nErrors:");
    for (const e of env.errors) console.log("  -", e);
    process.exit(1);
  }

  const provider = new MockResearchProvider();
  let ok = 0;

  for (const fixtureId of MOCK_RESEARCH_FIXTURE_IDS) {
    const ctx = buildResearchContext({
      clinicId: fixtureId,
      businessName: fixtureId,
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Validation fixture",
      websiteUrl: "https://example-clinic.ca",
      rawPages: [],
    });

    const result = await runClinicResearch(provider, ctx);
    if (!result.ok) {
      console.log(`\n[FAIL] ${fixtureId}: ${result.error}`);
      continue;
    }

    ok += 1;
    const p = result.profile;
    console.log(`\n--- ${fixtureId} ---`);
    console.log("  status:", p.researchStatus);
    console.log("  services:", p.services.map((s) => `${s.normalizedValue} (${s.inventoryState})`).join(", ") || "(none)");
    console.log("  capabilities:", p.capabilities.map((c) => `${c.capabilityTag ?? c.normalizedValue} (${c.inventoryState})`).join(", ") || "(none)");
    console.log("  brands:", p.brands.map((b) => b.normalizedValue).join(", ") || "(none)");
    console.log("  practitioners:", p.practitioners.map((x) => x.normalizedValue).join(", ") || "(none)");
    console.log("  evidence count:", p.evidenceRefs.length);
    console.log("  ambiguities:", p.ambiguities.length);
    console.log("  unknowns:", p.unknowns.length);
    console.log("  product recommendation:", "none (Stage C)");
  }

  console.log(`\n${ok}/${MOCK_RESEARCH_FIXTURE_IDS.length} fixtures OK`);
  if (ok !== MOCK_RESEARCH_FIXTURE_IDS.length) process.exit(1);
  console.log("\nOK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
