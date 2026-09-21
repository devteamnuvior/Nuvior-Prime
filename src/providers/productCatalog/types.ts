import type {
  NuviorProduct,
  ProductCatalogMetadata,
  ProductFamilySummary,
} from "@/domain/products/nuviorProduct";
import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";

/**
 * Product catalog boundary — Odoo/Mock → canonical NuviorProduct[].
 * Domain and gap engine code depend on this interface only.
 */
export interface ProductCatalogProvider {
  readonly name: string;

  isUnavailable(): boolean;
  getUnavailableReason(): string | null;

  listProducts(): Promise<NuviorProduct[]>;
  listActiveProducts(): Promise<NuviorProduct[]>;
  getProductById(id: string): Promise<NuviorProduct | null>;
  listProductFamilies(): Promise<ProductFamilySummary[]>;
  getProductsByCapability(tag: CapabilityTag): Promise<NuviorProduct[]>;
  getCatalogMetadata(): Promise<ProductCatalogMetadata>;
}

export type ProductCatalogSnapshot = {
  products: NuviorProduct[];
  metadata: ProductCatalogMetadata;
};
