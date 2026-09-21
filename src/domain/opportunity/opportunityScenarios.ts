/**
 * Stage E validation scenarios — expected ranking outcomes.
 */

import type { GapScenario } from "@/domain/gap/gapScenarios";
import { GAP_VALIDATION_SCENARIOS } from "@/domain/gap/gapScenarios";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";

export type OpportunityScenario = GapScenario & {
  expectPrimaryProductId?: string | null;
  expectPrimaryStatus?: "CONFIRMED" | "PENDING_VERIFICATION" | "NONE" | "BLOCKED_DNC";
  expectTopProductIds?: string[];
  expectNoPrimary?: boolean;
  expectBlockedFamilies?: string[];
};

export const OPPORTUNITY_VALIDATION_SCENARIOS: OpportunityScenario[] = [
  {
    ...GAP_VALIDATION_SCENARIOS[0]!,
    id: "case-a-aptos-opportunity",
    expectTopProductIds: [
      CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
      CATALOG_PRODUCT_IDS.APTOS,
    ],
  },
  {
    ...GAP_VALIDATION_SCENARIOS[1]!,
    id: "case-b-threads-present",
    expectNoPrimary: true,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[2]!,
    id: "case-c-dermaceutic",
    expectPrimaryProductId: CATALOG_PRODUCT_IDS.DERMACEUTIC,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[3]!,
    id: "case-d-fidia",
    expectTopProductIds: [CATALOG_PRODUCT_IDS.FIDIA_HY_TISSUE_PRP],
  },
  {
    ...GAP_VALIDATION_SCENARIOS[4]!,
    id: "case-e-geske",
    expectPrimaryProductId: CATALOG_PRODUCT_IDS.GESKE,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[5]!,
    id: "case-f-former-meso",
    expectPrimaryProductId: CATALOG_PRODUCT_IDS.DERMACEUTIC,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[6]!,
    id: "case-g-sparse",
    expectNoPrimary: true,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[7]!,
    id: "case-h-scope-blocked",
    expectBlockedFamilies: ["APTOS"],
    expectNoPrimary: true,
  },
  {
    ...GAP_VALIDATION_SCENARIOS[8]!,
    id: "case-i-training",
    expectPrimaryProductId: CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
  },
];
