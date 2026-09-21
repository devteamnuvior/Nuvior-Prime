import { MockPlacesProvider } from "./places/mockPlacesProvider";
import { createGooglePlacesProviderFromEnv } from "./places/googlePlacesProvider";
import type { PlacesProvider } from "./places/types";
import { MockCrmProvider } from "./crm/mockCrmProvider";
import { ImportCrmProvider } from "./crm/importCrmProvider";
import { ApiCrmProvider, UnavailableCrmProvider } from "./crm/apiCrmProvider";
import type { CrmProvider } from "./crm/types";
import {
  GeodesicRoutingProvider,
  MockRoutingProvider,
  type RoutingProvider,
} from "./routing/types";
import { createGoogleRoutingProviderFromEnv } from "./routing/googleRoutingProvider";
import { getRoutingConfig } from "@/domain/routing/config";
import type { EnrichmentProvider } from "./enrichment/websiteEnrichmentProvider";
import {
  FixtureEnrichmentProvider,
  WebsiteEnrichmentProvider,
} from "./enrichment/websiteEnrichmentProvider";
import { MOCK_WEBSITE_HTML } from "./enrichment/mockWebsiteFixtures";
import type { LlmProvider } from "./llm/types";
import { MockLlmProvider, NoneLlmProvider } from "./llm/mockLlmProvider";
import { OpenAiLlmProvider } from "./llm/openaiLlmProvider";
import { getLlmConfig } from "@/lib/llmConfig";
import { getCrmProviderConfig } from "@/lib/crmConfig";
import { getProductCatalogProvider } from "./productCatalog";
import { getResearchProvider } from "./research";

export function getPlacesProvider(): PlacesProvider {
  const which = (process.env.PLACES_PROVIDER ?? "mock").toLowerCase();

  if (which === "google") {
    const google = createGooglePlacesProviderFromEnv();
    if (!google) {
      console.warn(
        "[providers] PLACES_PROVIDER=google but GOOGLE_MAPS_SERVER_KEY / GOOGLE_PLACES_API_KEY is missing — falling back to mock",
      );
      return new MockPlacesProvider();
    }
    return google;
  }

  return new MockPlacesProvider();
}

/**
 * CRM provider selection — real modes never silently fall back to mock customer data.
 */
export function getCrmProvider(): CrmProvider {
  const cfg = getCrmProviderConfig();
  const which = cfg.mode;

  if (which === "mock") {
    return new MockCrmProvider(
      (process.env.CRM_UNAVAILABLE ?? "false").toLowerCase() === "true",
    );
  }

  if (which === "unavailable") {
    return new UnavailableCrmProvider("CRM_PROVIDER=unavailable");
  }

  if (which === "import" || which === "database") {
    return new ImportCrmProvider();
  }

  if (which === "api") {
    return new ApiCrmProvider();
  }

  // Unknown mode: fail-closed unless explicit mock fallback allowed (dev only).
  if (cfg.allowMockFallback && process.env.NODE_ENV === "development") {
    console.warn(
      `[providers] CRM_PROVIDER=${which} unknown — CRM_ALLOW_MOCK_FALLBACK in development; using mock`,
    );
    return new MockCrmProvider();
  }

  console.error(
    `[providers] CRM_PROVIDER=${which} is unsupported — refusing mock fallback; CRM unavailable`,
  );
  return new UnavailableCrmProvider(
    `Unsupported CRM_PROVIDER=${which} — set mock|import|api|database|unavailable`,
  );
}

export function getRoutingProvider(): RoutingProvider {
  const cfg = getRoutingConfig();
  if (cfg.provider === "mock") {
    return new MockRoutingProvider(
      (process.env.ROUTING_UNAVAILABLE ?? "false").toLowerCase() === "true",
    );
  }
  if (cfg.provider === "google") {
    const google = createGoogleRoutingProviderFromEnv({
      cacheTtlSeconds: cfg.cacheTtlSeconds,
      timeoutMs: cfg.timeoutMs,
      trafficAware: cfg.trafficMode === "traffic_aware",
    });
    if (!google) {
      console.warn(
        "[providers] ROUTING_PROVIDER=google but no API key — falling back to geodesic (not drive time)",
      );
      return new GeodesicRoutingProvider();
    }
    return google;
  }
  return new GeodesicRoutingProvider();
}

/**
 * Enrichment: fixtures when mock Places or ENRICHMENT_USE_FIXTURES=true;
 * otherwise live WebsiteEnrichmentProvider (HTTP).
 */
export function getEnrichmentProvider(): EnrichmentProvider {
  const useFixtures =
    (process.env.ENRICHMENT_USE_FIXTURES ?? "").toLowerCase() === "true" ||
    (process.env.PLACES_PROVIDER ?? "mock").toLowerCase() === "mock";

  if (useFixtures) {
    return new FixtureEnrichmentProvider(MOCK_WEBSITE_HTML);
  }
  return new WebsiteEnrichmentProvider();
}

export function getLlmProvider(): LlmProvider {
  const cfg = getLlmConfig();
  if (cfg.provider === "none") return new NoneLlmProvider();
  if (cfg.provider === "mock") return new MockLlmProvider();
  if (cfg.provider === "openai") {
    const openai = new OpenAiLlmProvider({ model: cfg.model });
    if (!openai.isEnabled()) {
      console.warn(
        "[providers] LLM_PROVIDER=openai but OPENAI_API_KEY missing — falling back to mock",
      );
      return new MockLlmProvider();
    }
    return openai;
  }
  return new NoneLlmProvider();
}

export { getProductCatalogProvider };
export { getResearchProvider };
