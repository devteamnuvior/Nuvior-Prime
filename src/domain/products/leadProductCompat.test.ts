import { describe, expect, it } from "vitest";
import {
  catalogProductToLeadProduct,
  findCatalogProductForLead,
  leadProductToCatalogId,
  leadProductToFamily,
} from "./leadProductCompat";
import { MOCK_CATALOG_FIXTURES } from "@/providers/productCatalog/mockCatalogFixtures";

describe("LeadProduct ↔ catalog compatibility", () => {
  it("maps each allowed lead product to a catalog id", () => {
    expect(leadProductToCatalogId("APTOS")).toBe("nuvior-aptos-threads");
    expect(leadProductToCatalogId("DERMACEUTIC")).toBe("nuvior-dermaceutic-professional");
    expect(leadProductToCatalogId("APTOS_3_LEVEL_CERTIFICATION")).toBe("nuvior-aptos-cert-3-level");
  });

  it("maps catalog products back to lead codes when 1:1", () => {
    const aptos = MOCK_CATALOG_FIXTURES.find((p) => p.id === "nuvior-aptos-threads")!;
    expect(catalogProductToLeadProduct(aptos)).toBe("APTOS");
  });

  it("resolves lead product from catalog snapshot", () => {
    const p = findCatalogProductForLead(MOCK_CATALOG_FIXTURES, "GESKE");
    expect(p?.name).toMatch(/GESKE/);
  });

  it("maps certification leads to APTOS family", () => {
    expect(leadProductToFamily("APTOS_4_LEVEL_CERTIFICATION")).toBe("APTOS");
    expect(leadProductToFamily("DERMACEUTIC")).toBe("DERMACEUTIC");
  });
});
