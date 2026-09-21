import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export type FetchPageResult = {
  url: string;
  statusCode: number;
  bodyText: string;
  html: string;
  sourceTitle: string | null;
  cacheHit: boolean;
  error?: string;
};

export type PageFetcher = (url: string, opts: { timeoutMs: number; maxBytes: number }) => Promise<FetchPageResult>;

const memory = new Map<string, { result: FetchPageResult; expiresAt: number }>();

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createHttpPageFetcher(): PageFetcher {
  return async (url, opts) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "NUVIOR-Prime-Enrichment/0.3 (internal research; contact ops)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      const buf = await res.arrayBuffer();
      const sliced = buf.byteLength > opts.maxBytes ? buf.slice(0, opts.maxBytes) : buf;
      const html = new TextDecoder("utf-8", { fatal: false }).decode(sliced);
      const title =
        html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 200) ?? null;
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, opts.maxBytes);

      return {
        url,
        statusCode: res.status,
        bodyText,
        html,
        sourceTitle: title,
        cacheHit: false,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        url,
        statusCode: 0,
        bodyText: "",
        html: "",
        sourceTitle: null,
        cacheHit: false,
        error: msg.includes("abort") ? "timeout" : msg,
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

export async function fetchPageCached(
  url: string,
  opts: {
    timeoutMs: number;
    maxBytes: number;
    cacheTtlSeconds: number;
    forceRefresh?: boolean;
    fetcher: PageFetcher;
  },
): Promise<FetchPageResult> {
  const now = Date.now();
  if (!opts.forceRefresh) {
    const mem = memory.get(url);
    if (mem && mem.expiresAt > now) {
      return { ...mem.result, cacheHit: true };
    }
    try {
      const row = await prisma.websitePageCache.findUnique({ where: { url } });
      if (row && row.expiresAt.getTime() > now) {
        const result: FetchPageResult = {
          url: row.url,
          statusCode: row.statusCode,
          bodyText: row.bodyText,
          html: row.bodyText,
          sourceTitle: row.sourceTitle,
          cacheHit: true,
        };
        memory.set(url, { result, expiresAt: row.expiresAt.getTime() });
        return result;
      }
    } catch {
      /* table may not exist yet */
    }
  }

  const result = await opts.fetcher(url, {
    timeoutMs: opts.timeoutMs,
    maxBytes: opts.maxBytes,
  });

  if (!result.error && result.statusCode > 0) {
    const expiresAt = new Date(now + opts.cacheTtlSeconds * 1000);
    memory.set(url, { result, expiresAt: expiresAt.getTime() });
    try {
      let domain = "unknown";
      try {
        domain = new URL(url).hostname;
      } catch {
        /* ignore */
      }
      await prisma.websitePageCache.upsert({
        where: { url },
        create: {
          url,
          domain,
          statusCode: result.statusCode,
          contentHash: contentHash(result.bodyText),
          bodyText: result.bodyText.slice(0, opts.maxBytes),
          sourceTitle: result.sourceTitle,
          expiresAt,
        },
        update: {
          statusCode: result.statusCode,
          contentHash: contentHash(result.bodyText),
          bodyText: result.bodyText.slice(0, opts.maxBytes),
          sourceTitle: result.sourceTitle,
          fetchedAt: new Date(),
          expiresAt,
        },
      });
    } catch {
      /* ignore persistence errors */
    }
  }

  return result;
}
