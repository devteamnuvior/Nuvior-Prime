export type EnrichmentConfig = {
  enabled: boolean;
  maxAccounts: number;
  maxPagesPerAccount: number;
  maxRequests: number;
  timeoutMs: number;
  maxBytes: number;
  cacheTtlSeconds: number;
  forceRefresh: boolean;
};

export function getEnrichmentConfig(): EnrichmentConfig {
  return {
    enabled: (process.env.ENRICHMENT_ENABLED ?? "true").toLowerCase() !== "false",
    maxAccounts: Number(process.env.ENRICHMENT_MAX_ACCOUNTS ?? 5),
    maxPagesPerAccount: Number(process.env.ENRICHMENT_MAX_PAGES_PER_ACCOUNT ?? 4),
    maxRequests: Number(process.env.ENRICHMENT_MAX_REQUESTS ?? 30),
    timeoutMs: Number(process.env.ENRICHMENT_TIMEOUT_MS ?? 8000),
    maxBytes: Number(process.env.ENRICHMENT_MAX_BYTES ?? 500_000),
    cacheTtlSeconds: Number(process.env.ENRICHMENT_CACHE_TTL_SECONDS ?? 86400),
    forceRefresh: (process.env.ENRICHMENT_FORCE_REFRESH ?? "false").toLowerCase() === "true",
  };
}
