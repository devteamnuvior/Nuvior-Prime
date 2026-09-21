/**
 * Prefer a small set of same-domain pages — never crawl the whole site.
 */

export type CandidatePage = {
  url: string;
  kind: "home" | "about" | "services" | "contact" | "booking" | "shop" | "other";
};

const KIND_PATTERNS: { kind: CandidatePage["kind"]; re: RegExp }[] = [
  { kind: "about", re: /\/(about|team|our-?team|staff|providers|meet)(\/|$)/i },
  { kind: "services", re: /\/(services|treatments?|procedures|aesthetics|what-we-offer)(\/|$)/i },
  { kind: "contact", re: /\/(contact|location|find-us)(\/|$)/i },
  { kind: "booking", re: /\/(book|booking|appoint|schedule)(\/|$)/i },
  { kind: "shop", re: /\/(shop|products?|store|skincare)(\/|$)/i },
];

export function selectPagesToFetch(
  websiteUrl: string,
  htmlHome: string | null,
  maxPages: number,
): CandidatePage[] {
  let origin: URL;
  try {
    origin = new URL(websiteUrl);
  } catch {
    return [];
  }

  const pages: CandidatePage[] = [{ url: origin.toString(), kind: "home" }];
  const seen = new Set([origin.toString().replace(/\/$/, "")]);

  if (htmlHome) {
    const hrefRe = /href=["']([^"'#]+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(htmlHome))) {
      try {
        const abs = new URL(m[1]!, origin);
        if (abs.hostname !== origin.hostname) continue;
        if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
        if (/login|signin|portal|patient|account|cart|checkout|wp-admin/i.test(abs.pathname)) {
          continue;
        }
        const key = abs.origin + abs.pathname.replace(/\/$/, "");
        if (seen.has(key)) continue;
        for (const { kind, re } of KIND_PATTERNS) {
          if (re.test(abs.pathname)) {
            seen.add(key);
            pages.push({ url: abs.toString(), kind });
            break;
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Ensure common path guesses if not linked
  const guesses: { path: string; kind: CandidatePage["kind"] }[] = [
    { path: "/about", kind: "about" },
    { path: "/team", kind: "about" },
    { path: "/services", kind: "services" },
    { path: "/treatments", kind: "services" },
    { path: "/contact", kind: "contact" },
  ];
  for (const g of guesses) {
    const url = new URL(g.path, origin).toString();
    const key = url.replace(/\/$/, "");
    if (!seen.has(key) && pages.length < maxPages) {
      seen.add(key);
      pages.push({ url, kind: g.kind });
    }
  }

  const priority: CandidatePage["kind"][] = [
    "home",
    "about",
    "services",
    "contact",
    "booking",
    "shop",
    "other",
  ];
  pages.sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind));
  return pages.slice(0, maxPages);
}

export function isSameDomain(base: string, candidate: string): boolean {
  try {
    return new URL(base).hostname === new URL(candidate).hostname;
  } catch {
    return false;
  }
}
