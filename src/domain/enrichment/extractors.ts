/**
 * Deterministic extractors — keyword/regex only, no LLM.
 * Keyword hit alone does not equal VERIFIED_SOURCE.
 */

import type { EnrichmentFacts, EvidenceRecord, ExtractedPerson } from "./types";
import { createHash } from "crypto";

export const SKINCARE_BRANDS = [
  "ZO Skin Health",
  "Obagi",
  "SkinCeuticals",
  "AlumierMD",
  "Vivier",
  "VI Peel",
  "PCA Skin",
  "Neostrata",
  "Environ",
  "Image Skincare",
  "SkinMedica",
  "Perfect Derma Peel",
  "Dermaceutic",
  "Mesoestetic",
  "Cosmelan",
  "Dermamelan",
] as const;

export const FILLER_TOXIN_BRANDS = [
  "Botox",
  "Dysport",
  "Xeomin",
  "Nuceiva",
  "Juvederm",
  "Restylane",
  "Teosyal",
  "Belotero",
  "Radiesse",
  "Sculptra",
] as const;

export const THREAD_BRANDS = ["Aptos", "PDO", "PLLA", "Silhouette Soft", "Mint PDO", "NovaThreads"] as const;

export const DEVICE_NAMES = [
  "Morpheus8",
  "Emsculpt",
  "CoolSculpting",
  "Fraxel",
  "Halo",
  "BBL",
  "Sciton",
  "Candela",
  "Cynosure",
  "Cutera",
  "InMode",
  "Ultherapy",
  "Thermage",
  "Sofwave",
  "HydraFacial",
] as const;

function hashSnippet(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function evidenceBase(
  fieldPath: string,
  value: string,
  sourceUrl: string,
  sourceTitle: string | null,
  snippet: string,
  state: EvidenceRecord["verificationState"],
  confidence: EvidenceRecord["confidence"],
): EvidenceRecord {
  return {
    fieldPath,
    value,
    sourceType: "website",
    sourceUrl,
    sourceTitle,
    snippet: snippet.slice(0, 280),
    retrievedAt: new Date().toISOString(),
    confidence,
    verificationState: state,
    contentHash: hashSnippet(snippet),
  };
}

/** Strip tags to approximate visible text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEmails(text: string, sourceUrl: string, title: string | null): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const seen = new Set<string>();
  for (const match of text.match(re) ?? []) {
    const email = match.toLowerCase();
    if (seen.has(email)) continue;
    if (/example\.com|sentry\.|wixpress|cloudflare/.test(email)) continue;
    seen.add(email);
    out.push(
      evidenceBase(
        "generalEmail",
        email,
        sourceUrl,
        title,
        match,
        "VERIFIED_SOURCE",
        "high",
      ),
    );
  }
  return out;
}

export function extractBookingLinks(
  html: string,
  sourceUrl: string,
  title: string | null,
  pageUrl: string,
): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const href = m[1]!;
    const lower = href.toLowerCase();
    if (
      /book|booking|appoint|schedul|jane\.app|clinicense|mindbody|acuity|calendly|square\.site/.test(
        lower,
      )
    ) {
      try {
        const abs = new URL(href, pageUrl).toString();
        out.push(
          evidenceBase(
            "onlineBookingUrl",
            abs,
            sourceUrl,
            title,
            href,
            "VERIFIED_SOURCE",
            "medium",
          ),
        );
      } catch {
        /* ignore bad URLs */
      }
    }
  }
  return out;
}

export function extractSocialLinks(
  html: string,
  sourceUrl: string,
  title: string | null,
  pageUrl: string,
): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html))) {
    const href = m[1]!;
    try {
      const abs = new URL(href, pageUrl).toString();
      if (/instagram\.com\//i.test(abs)) {
        const handle = abs.match(/instagram\.com\/([^/?#]+)/i)?.[1];
        if (handle && !["p", "reel", "stories"].includes(handle.toLowerCase())) {
          out.push(
            evidenceBase("instagramHandle", `@${handle}`, sourceUrl, title, abs, "VERIFIED_SOURCE", "high"),
          );
        }
      }
      if (/linkedin\.com\//i.test(abs)) {
        out.push(evidenceBase("linkedinUrl", abs, sourceUrl, title, abs, "VERIFIED_SOURCE", "high"));
      }
      if (/tiktok\.com\/@/i.test(abs)) {
        const handle = abs.match(/tiktok\.com\/@([^/?#]+)/i)?.[1];
        if (handle) {
          out.push(
            evidenceBase("tiktokHandle", `@${handle}`, sourceUrl, title, abs, "VERIFIED_SOURCE", "high"),
          );
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

export function extractPeople(text: string, sourceUrl: string, title: string | null): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  // Prefer "Name, CRED — Role" before "Dr. Name" to avoid swallowing clinic name prefixes.
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(MD|NP|RN|RPN|ND)\b(?:\s*[-–—,:]\s*|\s+)([A-Za-z][A-Za-z\s/]{2,40})?/g,
    /\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:,?\s+(MD))?(?:\s*[-–—,:]\s*|\s+)([A-Za-z][A-Za-z\s/]{2,40})?/g,
  ];

  const seen = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const local = new RegExp(re.source, re.flags);
    while ((m = local.exec(text))) {
      const name = (m[1] ?? "").replace(/^Dr\.?\s*/i, "").trim();
      const credentials = (m[2] ?? "MD").toUpperCase();
      const roleRaw = (m[3] ?? "").trim();
      const role = /medical director/i.test(roleRaw)
        ? "medical director"
        : /owner/i.test(roleRaw)
          ? "owner"
          : /manager/i.test(roleRaw)
            ? "clinic manager"
            : /inject/i.test(roleRaw)
              ? "injector"
              : roleRaw || "practitioner";
      if (!name || name.length < 3) continue;
      const key = `${name.toLowerCase()}|${credentials}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const snippet = m[0].slice(0, 200);
      const ev = evidenceBase(
        "people",
        `${name} (${credentials}) — ${role}`,
        sourceUrl,
        title,
        snippet,
        "VERIFIED_SOURCE",
        "high",
      );
      people.push({
        name,
        credentials,
        role,
        performsInjectables: /inject|toxin|filler|aesthetic/i.test(roleRaw + snippet) ? true : null,
        evidence: ev,
      });
    }
  }
  return people;
}

export function extractServices(text: string, sourceUrl: string, title: string | null): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const lower = text.toLowerCase();

  const add = (
    field: string,
    value: string,
    pattern: RegExp,
    state: EvidenceRecord["verificationState"] = "VERIFIED_SOURCE",
  ) => {
    const m = text.match(pattern) ?? lower.match(pattern);
    if (m) {
      out.push(
        evidenceBase(field, value, sourceUrl, title, m[0], state, state === "VERIFIED_SOURCE" ? "high" : "medium"),
      );
    }
  };

  add("injectablesOffered", "yes — toxin/filler mentioned", /\b(botox|dysport|xeomin|dermal filler|injectable|neuromodulator)s?\b/i);
  add("prpOffered", "yes — PRP mentioned", /\b(PRP|platelet[- ]rich plasma|vampire facial)\b/i);
  add("peelsOffered", "yes — chemical peels mentioned", /\b(chemical peel|glycolic peel|TCA peel|medical peel|cosmeceutical peel)\b/i);
  add("microneedlingOffered", "yes — microneedling mentioned", /\bmicroneedling\b/i);

  // Threads: require explicit thread terminology — not generic "lift"
  if (/\b(pdo\s*threads?|plla\s*threads?|thread\s*lift|threadlifting|silhouette\s*(soft|lift)|aptos)\b/i.test(text)) {
    const m = text.match(/\b(pdo\s*threads?|plla\s*threads?|thread\s*lift|threadlifting|silhouette\s*(soft|lift)|aptos)[^.?]{0,40}/i);
    out.push(
      evidenceBase(
        "advertisesThreadLifting",
        "true",
        sourceUrl,
        title,
        m?.[0] ?? "thread lift",
        "VERIFIED_SOURCE",
        "high",
      ),
    );
    out.push(
      evidenceBase(
        "threadsOffered",
        m?.[0]?.trim() ?? "yes — threads mentioned",
        sourceUrl,
        title,
        m?.[0] ?? "threads",
        "VERIFIED_SOURCE",
        "high",
      ),
    );
  } else if (/\bfacelift\b|\bjawline lift\b/i.test(text) && !/thread/i.test(text)) {
    out.push(
      evidenceBase(
        "threadsOffered",
        "AMBIGUOUS — lift language without thread terms",
        sourceUrl,
        title,
        "lift without thread",
        "AMBIGUOUS",
        "low",
      ),
    );
  }

  const services: string[] = [];
  for (const label of ["Botox", "Fillers", "PRP", "Chemical peels", "Microneedling", "Laser", "Thread lift"]) {
    if (new RegExp(label.replace(" ", "\\s+"), "i").test(text)) services.push(label);
  }
  if (services.length) {
    out.push(
      evidenceBase(
        "serviceMenuSummary",
        services.join("; "),
        sourceUrl,
        title,
        services.join(", "),
        "DERIVED",
        "medium",
      ),
    );
  }

  return out;
}

export function extractBrands(text: string, sourceUrl: string, title: string | null): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const foundSkin: string[] = [];
  const foundFiller: string[] = [];
  const foundThread: string[] = [];
  const foundDevices: string[] = [];

  for (const b of SKINCARE_BRANDS) {
    if (new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) foundSkin.push(b);
  }
  for (const b of FILLER_TOXIN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) foundFiller.push(b);
  }
  for (const b of THREAD_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) foundThread.push(b);
  }
  for (const b of DEVICE_NAMES) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) foundDevices.push(b);
  }

  if (foundSkin.length) {
    out.push(
      evidenceBase("skincareLines", foundSkin.join("; "), sourceUrl, title, foundSkin.join(", "), "VERIFIED_SOURCE", "high"),
    );
    const competitors = foundSkin.filter((b) => b !== "Dermaceutic");
    if (competitors.length) {
      out.push(
        evidenceBase(
          "competitorBrandsVisible",
          competitors.join("; "),
          sourceUrl,
          title,
          competitors.join(", "),
          "VERIFIED_SOURCE",
          "high",
        ),
      );
    }
    if (foundSkin.some((b) => /mesoestetic|cosmelan|dermamelan/i.test(b))) {
      out.push(
        evidenceBase(
          "mesoesteticMentioned",
          "true",
          sourceUrl,
          title,
          "Mesoestetic/Cosmelan/Dermamelan mentioned",
          "VERIFIED_SOURCE",
          "high",
        ),
      );
    }
  }
  if (foundFiller.length) {
    out.push(
      evidenceBase(
        "fillerToxinBrands",
        foundFiller.join("; "),
        sourceUrl,
        title,
        foundFiller.join(", "),
        "VERIFIED_SOURCE",
        "high",
      ),
    );
  }
  if (foundThread.length) {
    out.push(
      evidenceBase("threadBrands", foundThread.join("; "), sourceUrl, title, foundThread.join(", "), "VERIFIED_SOURCE", "high"),
    );
  }
  if (foundDevices.length) {
    out.push(
      evidenceBase("devicesOnSite", foundDevices.join("; "), sourceUrl, title, foundDevices.join(", "), "VERIFIED_SOURCE", "high"),
    );
  }
  return out;
}

export function extractCommercialSignals(
  text: string,
  sourceUrl: string,
  title: string | null,
): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  const years = text.match(/est(?:ablished)?\.?\s+(?:in\s+)?(19|20)\d{2}/i);
  if (years) {
    out.push(
      evidenceBase("yearsInBusiness", years[0], sourceUrl, title, years[0], "VERIFIED_SOURCE", "medium"),
    );
  }
  if (/\b(locations?|multiple clinics|now open in|expanding to|we'?re hiring|now hiring)\b/i.test(text)) {
    const m = text.match(/\b(locations?|multiple clinics|now open in|expanding to|we'?re hiring|now hiring)[^.?]{0,60}/i);
    out.push(
      evidenceBase(
        "expansionSignals",
        m?.[0]?.trim() ?? "expansion/hiring language",
        sourceUrl,
        title,
        m?.[0] ?? "expansion",
        "AMBIGUOUS",
        "low",
      ),
    );
    if (/\b(locations?|multiple clinics)\b/i.test(text)) {
      out.push(
        evidenceBase("multiLocation", "true", sourceUrl, title, m?.[0] ?? "locations", "DERIVED", "medium"),
      );
    }
  }
  return out;
}

export function emptyFacts(): EnrichmentFacts {
  return {
    generalEmail: null,
    onlineBookingUrl: null,
    instagramHandle: null,
    linkedinUrl: null,
    tiktokHandle: null,
    serviceMenuSummary: null,
    injectablesOffered: null,
    threadsOffered: null,
    prpOffered: null,
    peelsOffered: null,
    microneedlingOffered: null,
    devicesOnSite: null,
    skincareLines: null,
    competitorBrandsVisible: null,
    fillerToxinBrands: null,
    threadBrands: null,
    advertisesThreadLifting: null,
    yearsInBusiness: null,
    expansionSignals: null,
    multiLocation: null,
    people: [],
    mesoesteticMentioned: false,
  };
}

export function factsFromEvidence(evidence: EvidenceRecord[], people: ExtractedPerson[]): EnrichmentFacts {
  const facts = emptyFacts();
  const first = (path: string) => evidence.find((e) => e.fieldPath === path && e.verificationState !== "AMBIGUOUS");

  facts.generalEmail = first("generalEmail")?.value ?? null;
  facts.onlineBookingUrl = first("onlineBookingUrl")?.value ?? null;
  facts.instagramHandle = first("instagramHandle")?.value ?? null;
  facts.linkedinUrl = first("linkedinUrl")?.value ?? null;
  facts.tiktokHandle = first("tiktokHandle")?.value ?? null;
  facts.serviceMenuSummary = first("serviceMenuSummary")?.value ?? null;
  facts.injectablesOffered = first("injectablesOffered")?.value ?? null;
  facts.threadsOffered = first("threadsOffered")?.value ?? null;
  facts.prpOffered = first("prpOffered")?.value ?? null;
  facts.peelsOffered = first("peelsOffered")?.value ?? null;
  facts.microneedlingOffered = first("microneedlingOffered")?.value ?? null;
  facts.devicesOnSite = first("devicesOnSite")?.value ?? null;
  facts.skincareLines = first("skincareLines")?.value ?? null;
  facts.competitorBrandsVisible = first("competitorBrandsVisible")?.value ?? null;
  facts.fillerToxinBrands = first("fillerToxinBrands")?.value ?? null;
  facts.threadBrands = first("threadBrands")?.value ?? null;
  facts.yearsInBusiness = first("yearsInBusiness")?.value ?? null;
  facts.expansionSignals = first("expansionSignals")?.value ?? null;
  facts.multiLocation = first("multiLocation")?.value === "true" ? true : null;
  facts.advertisesThreadLifting =
    first("advertisesThreadLifting")?.value === "true"
      ? true
      : evidence.some((e) => e.fieldPath === "advertisesThreadLifting")
        ? true
        : null;
  facts.mesoesteticMentioned = evidence.some((e) => e.fieldPath === "mesoesteticMentioned");
  facts.people = people;
  return facts;
}
