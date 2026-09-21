import type { EnrichmentResult, EvidenceRecord, ExtractedPerson } from "@/domain/enrichment/types";
import {
  extractBookingLinks,
  extractBrands,
  extractCommercialSignals,
  extractEmails,
  extractPeople,
  extractServices,
  extractSocialLinks,
  factsFromEvidence,
  htmlToText,
} from "@/domain/enrichment/extractors";
import { aggregateEvidence, buildMissingFieldVerification, dedupeEvidence } from "@/domain/enrichment/aggregateEvidence";
import { selectPagesToFetch } from "@/domain/enrichment/pageSelection";
import {
  createHttpPageFetcher,
  fetchPageCached,
  type PageFetcher,
} from "./fetchPage";

export type EnrichmentTarget = {
  accountId: string;
  businessName: string;
  website: string | null;
  /** Places-derived evidence to merge (website URL etc.) */
  placesEvidence?: EvidenceRecord[];
};

export type EnrichmentBudget = {
  maxPagesPerAccount: number;
  maxRequestsRemaining: { value: number };
  timeoutMs: number;
  maxBytes: number;
  cacheTtlSeconds: number;
  forceRefresh?: boolean;
};

export interface EnrichmentProvider {
  readonly name: string;
  enrich(target: EnrichmentTarget, budget: EnrichmentBudget): Promise<EnrichmentResult>;
}

export class WebsiteEnrichmentProvider implements EnrichmentProvider {
  readonly name = "website";

  constructor(private readonly fetcher: PageFetcher = createHttpPageFetcher()) {}

  async enrich(target: EnrichmentTarget, budget: EnrichmentBudget): Promise<EnrichmentResult> {
    const errors: string[] = [];
    let pagesFetched = 0;
    let cacheHits = 0;

    if (!target.website) {
      const missing = buildMissingFieldVerification(target.accountId, target.businessName, [
        "website",
        "practitioners / credentials",
        "injectablesOffered",
        "threadsOffered",
        "skincareLines",
      ]);
      return {
        accountId: target.accountId,
        website: null,
        facts: factsFromEvidence([], []),
        evidence: target.placesEvidence ?? [],
        resolved: [],
        verificationItems: missing,
        pagesFetched: 0,
        cacheHits: 0,
        errors: [],
        skipped: true,
        skipReason: "No website on discovered place",
      };
    }

    let websiteUrl = target.website;
    if (!/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const allEvidence: EvidenceRecord[] = [...(target.placesEvidence ?? [])];
    const people: ExtractedPerson[] = [];

    // Fetch homepage first
    if (budget.maxRequestsRemaining.value <= 0) {
      return skippedBudget(target, "Request budget exhausted before homepage");
    }

    budget.maxRequestsRemaining.value -= 1;
    const home = await fetchPageCached(websiteUrl, {
      timeoutMs: budget.timeoutMs,
      maxBytes: budget.maxBytes,
      cacheTtlSeconds: budget.cacheTtlSeconds,
      forceRefresh: budget.forceRefresh,
      fetcher: this.fetcher,
    });
    pagesFetched += 1;
    if (home.cacheHit) cacheHits += 1;
    if (home.error) {
      errors.push(`Homepage fetch failed: ${home.error}`);
      return {
        accountId: target.accountId,
        website: websiteUrl,
        facts: factsFromEvidence(allEvidence, []),
        evidence: allEvidence,
        resolved: [],
        verificationItems: buildMissingFieldVerification(target.accountId, target.businessName, [
          "website enrichment",
          "practitioners / credentials",
        ]),
        pagesFetched,
        cacheHits,
        errors,
        skipped: true,
        skipReason: home.error,
      };
    }

    const pages = selectPagesToFetch(websiteUrl, home.html || home.bodyText, budget.maxPagesPerAccount);

    for (const page of pages) {
      let fetched = home;
      if (page.kind !== "home" || page.url !== websiteUrl) {
        if (budget.maxRequestsRemaining.value <= 0) {
          errors.push("Request budget exhausted mid-account");
          break;
        }
        budget.maxRequestsRemaining.value -= 1;
        fetched = await fetchPageCached(page.url, {
          timeoutMs: budget.timeoutMs,
          maxBytes: budget.maxBytes,
          cacheTtlSeconds: budget.cacheTtlSeconds,
          forceRefresh: budget.forceRefresh,
          fetcher: this.fetcher,
        });
        pagesFetched += 1;
        if (fetched.cacheHit) cacheHits += 1;
        if (fetched.error || fetched.statusCode >= 400 || fetched.statusCode === 0) {
          errors.push(`${page.url}: ${fetched.error ?? `HTTP ${fetched.statusCode}`}`);
          continue;
        }
      }

      const html = fetched.html || fetched.bodyText;
      const text = htmlToText(html);
      const title = fetched.sourceTitle;
      const url = fetched.url;

      allEvidence.push(...extractEmails(text, url, title));
      allEvidence.push(...extractBookingLinks(html, url, title, url));
      allEvidence.push(...extractSocialLinks(html, url, title, url));
      allEvidence.push(...extractServices(text, url, title));
      allEvidence.push(...extractBrands(text, url, title));
      allEvidence.push(...extractCommercialSignals(text, url, title));
      people.push(...extractPeople(text, url, title));
    }

    for (const p of people) {
      allEvidence.push(p.evidence);
    }

    const deduped = dedupeEvidence(allEvidence);
    const { resolved, verificationItems } = aggregateEvidence(
      target.accountId,
      target.businessName,
      deduped,
    );

    // Always queue clinical unknowns if not found
    const have = new Set(resolved.map((r) => r.fieldPath));
    for (const f of ["injectablesOffered", "threadsOffered", "skincareLines", "people"]) {
      if (!have.has(f)) {
        verificationItems.push(
          ...buildMissingFieldVerification(target.accountId, target.businessName, [f]),
        );
      }
    }

    // Ambiguous category / medical supervision
    if (!people.some((p) => /MD|NP/i.test(p.credentials))) {
      verificationItems.push({
        accountId: target.accountId,
        accountName: target.businessName,
        fieldPath: "medicalSupervision",
        value: "UNKNOWN, verify",
        reason: "No explicit MD/NP named on fetched pages",
        sourceType: "aggregation",
        sourceUrl: websiteUrl,
        status: "MANUAL_VERIFY",
        snippet: null,
      });
    }

    return {
      accountId: target.accountId,
      website: websiteUrl,
      facts: factsFromEvidence(deduped, people),
      evidence: deduped,
      resolved,
      verificationItems,
      pagesFetched,
      cacheHits,
      errors,
      skipped: false,
      skipReason: null,
    };
  }
}

function skippedBudget(target: EnrichmentTarget, reason: string): EnrichmentResult {
  return {
    accountId: target.accountId,
    website: target.website,
    facts: factsFromEvidence([], []),
    evidence: target.placesEvidence ?? [],
    resolved: [],
    verificationItems: buildMissingFieldVerification(target.accountId, target.businessName, [
      "enrichment",
    ]),
    pagesFetched: 0,
    cacheHits: 0,
    errors: [reason],
    skipped: true,
    skipReason: reason,
  };
}

/** Test/dev fixture provider — no network. */
export class FixtureEnrichmentProvider implements EnrichmentProvider {
  readonly name = "fixture";

  constructor(private readonly fixtures: Record<string, string>) {}

  async enrich(target: EnrichmentTarget, budget: EnrichmentBudget): Promise<EnrichmentResult> {
    const html = this.fixtures[target.accountId] ?? this.fixtures["*"];
    if (!html) {
      return new WebsiteEnrichmentProvider(async () => ({
        url: target.website ?? "",
        statusCode: 0,
        bodyText: "",
        html: "",
        sourceTitle: null,
        cacheHit: false,
        error: "no fixture",
      })).enrich(target, budget);
    }

    const fetcher: PageFetcher = async (url) => ({
      url,
      statusCode: 200,
      bodyText: html,
      html,
      sourceTitle: "Fixture page",
      cacheHit: false,
    });
    return new WebsiteEnrichmentProvider(fetcher).enrich(
      { ...target, website: target.website ?? "https://fixture.example" },
      budget,
    );
  }
}
