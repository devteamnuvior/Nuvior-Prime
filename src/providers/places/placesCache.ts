/**
 * In-memory + optional Prisma cache for Places API responses.
 * Dedupes expensive calls within a process and across short TTLs.
 */

import { prisma } from "@/lib/prisma";

export type CacheEntry = {
  key: string;
  payload: unknown;
  fetchedAt: Date;
};

const memory = new Map<string, { payload: unknown; expiresAt: number }>();

export function memoryCacheGet(key: string): unknown | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memory.delete(key);
    return null;
  }
  return hit.payload;
}

export function memoryCacheSet(key: string, payload: unknown, ttlSeconds: number): void {
  memory.set(key, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function dbCacheGet(key: string, ttlSeconds: number): Promise<unknown | null> {
  try {
    const row = await prisma.placesApiCache.findUnique({ where: { cacheKey: key } });
    if (!row) return null;
    const ageSec = (Date.now() - row.fetchedAt.getTime()) / 1000;
    if (ageSec > ttlSeconds) return null;
    return row.payload;
  } catch {
    // Table may not exist yet during migrate — memory-only fallback
    return null;
  }
}

export async function dbCacheSet(
  key: string,
  provider: string,
  endpoint: string,
  providerRecordId: string | null,
  payload: unknown,
): Promise<void> {
  try {
    await prisma.placesApiCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        provider,
        endpoint,
        providerRecordId,
        payload: payload as object,
      },
      update: {
        payload: payload as object,
        fetchedAt: new Date(),
        providerRecordId,
      },
    });
  } catch {
    // ignore persistence failures in Phase 2
  }
}

export async function cachedFetch(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<unknown>,
  meta: { provider: string; endpoint: string; providerRecordId?: string | null },
): Promise<{ payload: unknown; cacheHit: boolean }> {
  const mem = memoryCacheGet(key);
  if (mem != null) return { payload: mem, cacheHit: true };

  const db = await dbCacheGet(key, ttlSeconds);
  if (db != null) {
    memoryCacheSet(key, db, ttlSeconds);
    return { payload: db, cacheHit: true };
  }

  const payload = await fetcher();
  memoryCacheSet(key, payload, ttlSeconds);
  await dbCacheSet(
    key,
    meta.provider,
    meta.endpoint,
    meta.providerRecordId ?? null,
    payload,
  );
  return { payload, cacheHit: false };
}
