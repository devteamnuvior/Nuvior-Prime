/**
 * Server-side CRM provider configuration — never expose tokens to client.
 */

export type CrmProviderMode = "mock" | "unavailable" | "import" | "api" | "database";

export type CrmProviderConfig = {
  mode: CrmProviderMode;
  importPath: string | null;
  apiBaseUrl: string | null;
  /** Present only server-side; never log. */
  hasApiToken: boolean;
  cacheTtlSeconds: number;
  allowMockFallback: boolean;
};

export function getCrmProviderConfig(): CrmProviderConfig {
  const mode = (process.env.CRM_PROVIDER ?? "mock").toLowerCase() as CrmProviderMode;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowMockFallback =
    (process.env.CRM_ALLOW_MOCK_FALLBACK ?? "").toLowerCase() === "true" ||
    (nodeEnv === "development" && mode === "mock");

  return {
    mode: ["mock", "unavailable", "import", "api", "database"].includes(mode)
      ? mode
      : (mode as CrmProviderMode),
    importPath: process.env.CRM_IMPORT_PATH?.trim() || null,
    apiBaseUrl: process.env.CRM_API_BASE_URL?.trim() || null,
    hasApiToken: Boolean(process.env.CRM_API_TOKEN?.trim()),
    cacheTtlSeconds: Number(process.env.CRM_CACHE_TTL_SECONDS ?? "604800") || 604800,
    allowMockFallback,
  };
}

/**
 * Validate env at startup / validate:crm. Does not print secrets.
 */
export function validateCrmEnv(): { ok: boolean; errors: string[]; warnings: string[] } {
  const cfg = getCrmProviderConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  const known = ["mock", "unavailable", "import", "api", "database"];
  if (!known.includes(cfg.mode)) {
    errors.push(
      `CRM_PROVIDER=${cfg.mode} is not supported. Use mock|unavailable|import|api|database — will not silently fall back to mock.`,
    );
  }

  if (cfg.mode === "api") {
    if (!cfg.apiBaseUrl) {
      warnings.push(
        "CRM_PROVIDER=api without CRM_API_BASE_URL — provider will be unavailable (fail-closed).",
      );
    } else {
      warnings.push(
        "CRM_API_BASE_URL set but no in-repo vendor contract — API mode stays unavailable until a real adapter is registered.",
      );
    }
    if (cfg.hasApiToken && !cfg.apiBaseUrl) {
      errors.push("CRM_API_TOKEN set without CRM_API_BASE_URL");
    }
  }

  if (cfg.mode === "import" || cfg.mode === "database") {
    if (!cfg.importPath) {
      warnings.push(
        "CRM_IMPORT_PATH unset — import CLI defaults to fixtures/crm or path argument.",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
