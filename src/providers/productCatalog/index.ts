import { getProductCatalogConfig } from "@/lib/productCatalogConfig";
import { CachedProductCatalogProvider } from "./cachedProductCatalogProvider";
import { MockProductCatalogProvider } from "./mockProductCatalogProvider";
import { OdooProductCatalogProvider } from "./odooProductCatalogProvider";
import { UnavailableProductCatalogProvider } from "./unavailableProductCatalogProvider";
import type { ProductCatalogProvider } from "./types";

let singleton: ProductCatalogProvider | null = null;

/**
 * Server-side product catalog factory.
 * Odoo mode never silently falls back to mock.
 */
export function getProductCatalogProvider(): ProductCatalogProvider {
  if (singleton) return singleton;

  const cfg = getProductCatalogConfig();
  let inner: ProductCatalogProvider;

  if (cfg.mode === "mock") {
    const simulateUnavailable =
      (process.env.PRODUCT_CATALOG_UNAVAILABLE ?? "false").toLowerCase() === "true";
    inner = new MockProductCatalogProvider(
      simulateUnavailable
        ? { unavailable: true, reason: "PRODUCT_CATALOG_UNAVAILABLE=true" }
        : undefined,
    );
  } else if (cfg.mode === "odoo") {
    inner = new OdooProductCatalogProvider();
  } else if (cfg.mode === "unavailable") {
    inner = new UnavailableProductCatalogProvider("PRODUCT_CATALOG_PROVIDER=unavailable");
  } else {
    inner = new UnavailableProductCatalogProvider(
      `Unsupported PRODUCT_CATALOG_PROVIDER=${cfg.mode}`,
    );
  }

  singleton = new CachedProductCatalogProvider(
    inner,
    cfg.cacheTtlSeconds * 1000,
    cfg.staleAfterSeconds * 1000,
  );
  return singleton;
}

/** Test helper — reset singleton between tests. */
export function resetProductCatalogProviderForTests(): void {
  singleton = null;
}

export type { ProductCatalogProvider } from "./types";
export { loadProductCatalogSnapshot } from "./cachedProductCatalogProvider";
