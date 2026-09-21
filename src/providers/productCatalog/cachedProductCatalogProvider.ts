import type {
  NuviorProduct,
  ProductCatalogMetadata,
  ProductFamilySummary,
} from "@/domain/products/nuviorProduct";
import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { ProductCatalogProvider, ProductCatalogSnapshot } from "./types";

type CacheEntry = {
  snapshot: ProductCatalogSnapshot;
  expiresAt: number;
};

/**
 * In-process catalog cache — fetch/sync once, reuse canonical products.
 * Future Odoo sync should populate this layer, not re-fetch per clinic.
 */
export class CachedProductCatalogProvider implements ProductCatalogProvider {
  readonly name: string;
  private cache: CacheEntry | null = null;

  constructor(
    private inner: ProductCatalogProvider,
    private ttlMs: number,
    private staleAfterMs: number,
  ) {
    this.name = `cached:${inner.name}`;
  }

  isUnavailable(): boolean {
    return this.inner.isUnavailable();
  }

  getUnavailableReason(): string | null {
    return this.inner.getUnavailableReason();
  }

  /** Force refresh on next access. */
  invalidate(): void {
    this.cache = null;
  }

  private async loadSnapshot(): Promise<ProductCatalogSnapshot> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.snapshot;
    }

    const products = await this.inner.listProducts();
    const baseMeta = await this.inner.getCatalogMetadata();
    const fetchedAtMs = Date.parse(baseMeta.fetchedAt);
    const ageMs = Number.isFinite(fetchedAtMs) ? now - fetchedAtMs : 0;
    const stale =
      baseMeta.stale ||
      (baseMeta.sourceUpdatedAt != null &&
        ageMs > this.staleAfterMs &&
        !this.inner.isUnavailable());

    const metadata: ProductCatalogMetadata = {
      ...baseMeta,
      fetchedAt: new Date().toISOString(),
      stale,
      staleReason: stale
        ? (baseMeta.staleReason ?? "Catalog cache exceeded stale threshold")
        : null,
    };

    const snapshot = { products, metadata };
    this.cache = { snapshot, expiresAt: now + this.ttlMs };
    return snapshot;
  }

  async listProducts(): Promise<NuviorProduct[]> {
    const { products } = await this.loadSnapshot();
    return products;
  }

  async listActiveProducts(): Promise<NuviorProduct[]> {
    const products = await this.listProducts();
    return products.filter((p) => p.active);
  }

  async getProductById(id: string): Promise<NuviorProduct | null> {
    const products = await this.listProducts();
    return products.find((p) => p.id === id) ?? null;
  }

  async listProductFamilies(): Promise<ProductFamilySummary[]> {
    if (!this.cache || this.cache.expiresAt <= Date.now()) {
      await this.loadSnapshot();
    }
    return this.inner.listProductFamilies();
  }

  async getProductsByCapability(tag: CapabilityTag): Promise<NuviorProduct[]> {
    const products = await this.listProducts();
    return products.filter((p) => p.capabilityTags.includes(tag));
  }

  async getCatalogMetadata(): Promise<ProductCatalogMetadata> {
    const { metadata } = await this.loadSnapshot();
    return metadata;
  }
}

/** Load full catalog snapshot for gap engine / server routes. */
export async function loadProductCatalogSnapshot(
  provider: ProductCatalogProvider,
): Promise<ProductCatalogSnapshot> {
  const products = await provider.listProducts();
  const metadata = await provider.getCatalogMetadata();
  return { products, metadata };
}
