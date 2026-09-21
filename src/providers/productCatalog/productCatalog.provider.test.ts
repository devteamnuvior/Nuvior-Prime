import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockProductCatalogProvider } from "./mockProductCatalogProvider";
import { OdooProductCatalogProvider } from "./odooProductCatalogProvider";
import { UnavailableProductCatalogProvider } from "./unavailableProductCatalogProvider";
import {
  getProductCatalogProvider,
  resetProductCatalogProviderForTests,
} from "./index";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";

describe("ProductCatalogProvider — mock", () => {
  it("lists active products excluding inactive rows", async () => {
    const p = new MockProductCatalogProvider();
    const all = await p.listProducts();
    const active = await p.listActiveProducts();
    expect(all.length).toBeGreaterThan(active.length);
    expect(active.every((x) => x.active)).toBe(true);
  });

  it("finds product by id and capability", async () => {
    const p = new MockProductCatalogProvider();
    const aptos = await p.getProductById(CATALOG_PRODUCT_IDS.APTOS);
    expect(aptos?.productFamily).toBe("APTOS");
    const threads = await p.getProductsByCapability("THREAD_LIFTING");
    expect(threads.some((x) => x.id === CATALOG_PRODUCT_IDS.APTOS)).toBe(true);
  });

  it("returns catalog metadata with version and freshness", async () => {
    const p = new MockProductCatalogProvider();
    const meta = await p.getCatalogMetadata();
    expect(meta.provider).toBe("mock");
    expect(meta.catalogVersion).toMatch(/^[a-f0-9]{16}$/);
    expect(meta.stale).toBe(false);
    expect(meta.capabilityTaxonomyVersion).toBe("1.0.0");
  });

  it("lists product families with Mesoestetic non-recommendable", async () => {
    const p = new MockProductCatalogProvider();
    const families = await p.listProductFamilies();
    const meso = families.find((f) => f.code === "MESOESTETIC");
    expect(meso?.recommendable).toBe(false);
    const aptos = families.find((f) => f.code === "APTOS");
    expect(aptos?.recommendable).toBe(true);
  });

  it("reports unavailable when configured", async () => {
    const p = new MockProductCatalogProvider({ unavailable: true, reason: "test" });
    expect(p.isUnavailable()).toBe(true);
    expect(await p.listProducts()).toEqual([]);
  });
});

describe("ProductCatalogProvider — odoo boundary", () => {
  it("is unavailable without invented contract", () => {
    const p = new OdooProductCatalogProvider();
    expect(p.isUnavailable()).toBe(true);
    expect(p.getUnavailableReason()).toMatch(/not yet implemented|not configured/i);
  });

  it("returns stale metadata when unavailable", async () => {
    const meta = await new OdooProductCatalogProvider().getCatalogMetadata();
    expect(meta.stale).toBe(true);
    expect(meta.productCount).toBe(0);
  });
});

describe("ProductCatalogProvider — factory", () => {
  const env = { ...process.env };

  beforeEach(() => {
    resetProductCatalogProviderForTests();
  });

  afterEach(() => {
    process.env = { ...env };
    resetProductCatalogProviderForTests();
    vi.unstubAllEnvs();
  });

  it("uses mock by default", () => {
    vi.stubEnv("PRODUCT_CATALOG_PROVIDER", "mock");
    const p = getProductCatalogProvider();
    expect(p.name).toMatch(/mock/);
    expect(p.isUnavailable()).toBe(false);
  });

  it("does not fall back to mock when odoo is configured", () => {
    vi.stubEnv("PRODUCT_CATALOG_PROVIDER", "odoo");
    vi.stubEnv("ODOO_BASE_URL", "https://odoo.example.com");
    const p = getProductCatalogProvider();
    expect(p.name).toMatch(/odoo/);
    expect(p.isUnavailable()).toBe(true);
  });

  it("fail-closed for unknown provider mode", () => {
    vi.stubEnv("PRODUCT_CATALOG_PROVIDER", "invalid-mode");
    const p = getProductCatalogProvider();
    expect(p.isUnavailable()).toBe(true);
  });

  it("supports explicit unavailable mode", () => {
    vi.stubEnv("PRODUCT_CATALOG_PROVIDER", "unavailable");
    const p = getProductCatalogProvider();
    expect(p).toBeDefined();
    expect(p.isUnavailable()).toBe(true);
  });
});

describe("UnavailableProductCatalogProvider", () => {
  it("returns empty catalog", async () => {
    const p = new UnavailableProductCatalogProvider("test reason");
    expect(await p.listProducts()).toEqual([]);
    expect((await p.getCatalogMetadata()).stale).toBe(true);
  });
});
