#!/usr/bin/env tsx
/**
 * validate:product-gaps — deterministic gap engine fixtures (no Claude).
 */

import { buildResearchContext } from "../src/domain/research/buildContext";
import { runClinicResearch } from "../src/domain/research/runResearch";
import { MockResearchProvider } from "../src/providers/research/mockResearchProvider";
import { buildProfileInventory } from "../src/domain/gap/profileInventory";
import { GAP_VALIDATION_SCENARIOS } from "../src/domain/gap/gapScenarios";
import { runGapAnalysisForFixture } from "../src/domain/gap/gapTestHelpers";
import { PRODUCT_GAP_RULES_VERSION } from "../src/domain/gap/productGapAnalysis";

async function main() {
  console.log("Product gap validation (deterministic fixtures)\n");
  console.log("  PRODUCT_GAP_RULES_VERSION:", PRODUCT_GAP_RULES_VERSION);

  let ok = 0;

  for (const scenario of GAP_VALIDATION_SCENARIOS) {
    const ctx = buildResearchContext({
      clinicId: scenario.fixtureId,
      businessName: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      segmentNumber: 1,
      categoryLabel: "Validation",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) {
      console.log(`\n[FAIL] ${scenario.id}: ${research.error}`);
      continue;
    }

    const inventory = buildProfileInventory(research.profile);
    const analysis = await runGapAnalysisForFixture({
      fixtureId: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      credentials: scenario.credentials,
      crm: scenario.crm,
    });

    console.log(`\n--- ${scenario.id}: ${scenario.label} ---`);
    console.log("  clinic profile:", scenario.fixtureId);
    console.log(
      "  present capabilities:",
      inventory.presentCapabilities.join(", ") || "(none confirmed)",
    );
    console.log("  gaps detected:", analysis.gaps.length);
    for (const g of analysis.gaps) {
      console.log(`    - type=${g.gapType} capability=${g.capability ?? "n/a"} confidence=${g.confidence}`);
      console.log(`      products=${g.relevantProductIds.join(", ") || "(none)"}`);
      console.log(`      inventory=${g.clinicInventoryState ?? "crm-only"}`);
      console.log(`      verification=${g.verificationRequired ? "yes" : "no"}`);
      if (g.verificationQuestion) console.log(`      question="${g.verificationQuestion}"`);
      console.log(`      eligibility=${g.eligibilityState}`);
    }
    if (analysis.noClearGapReasons.length) {
      console.log("  no-clear-gap:", analysis.noClearGapReasons.join("; "));
    }
    console.log("  primary recommendation: none (Stage D)");
    console.log("  cache key inputs: profile + catalog + rules + CRM hash");

    ok += 1;
  }

  console.log(`\n${ok}/${GAP_VALIDATION_SCENARIOS.length} scenarios OK`);
  if (ok !== GAP_VALIDATION_SCENARIOS.length) process.exit(1);
  console.log("\nOK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
