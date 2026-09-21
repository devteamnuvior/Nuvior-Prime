/**
 * Server-side product catalog configuration.
 * Odoo credentials stay server-only — never NEXT_PUBLIC_.
 */

export type ProductCatalogProviderMode = "mock" | "odoo" | "unavailable";

export type ProductCatalogConfig = {
  mode: ProductCatalogProviderMode;
  cacheTtlSeconds: number;
  staleAfterSeconds: number;
  /** Odoo URL reserved — not used until real contract exists. */
  odooBaseUrl: string | null;
  hasOdooCredentials: boolean;
};

export function getProductCatalogConfig(): ProductCatalogConfig {
  const mode = (process.env.PRODUCT_CATALOG_PROVIDER ?? "mock").toLowerCase();
  const known: ProductCatalogProviderMode[] = ["mock", "odoo", "unavailable"];
  const resolved = known.includes(mode as ProductCatalogProviderMode)
    ? (mode as ProductCatalogProviderMode)
    : ("unavailable" as ProductCatalogProviderMode);

  return {
    mode: resolved,
    cacheTtlSeconds: Number(process.env.PRODUCT_CATALOG_CACHE_TTL_SECONDS ?? "3600") || 3600,
    staleAfterSeconds: Number(process.env.PRODUCT_CATALOG_STALE_AFTER_SECONDS ?? "86400") || 86400,
    odooBaseUrl: process.env.ODOO_BASE_URL?.trim() || null,
    hasOdooCredentials: Boolean(
      process.env.ODOO_API_KEY?.trim() || process.env.ODOO_PASSWORD?.trim(),
    ),
  };
}

export function validateProductCatalogEnv(): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const cfg = getProductCatalogConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  const raw = (process.env.PRODUCT_CATALOG_PROVIDER ?? "mock").toLowerCase();
  if (!["mock", "odoo", "unavailable"].includes(raw)) {
    errors.push(
      `PRODUCT_CATALOG_PROVIDER=${raw} is unsupported. Use mock|odoo|unavailable — will not silently fall back to mock.`,
    );
  }

  if (cfg.mode === "odoo") {
    warnings.push(
      "PRODUCT_CATALOG_PROVIDER=odoo — Odoo adapter contract is not implemented in-repo; provider will be unavailable until registered.",
    );
    if (!cfg.odooBaseUrl) {
      warnings.push("ODOO_BASE_URL unset — required when Odoo integration is wired.");
    }
    if (!cfg.hasOdooCredentials) {
      warnings.push("Odoo credentials unset — required when Odoo integration is wired.");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
