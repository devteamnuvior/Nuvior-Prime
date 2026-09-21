import { prisma } from "@/lib/prisma";
import { getLlmConfig } from "@/lib/llmConfig";

export async function getLlmCache(cacheKey: string): Promise<{
  content: unknown;
  model: string;
} | null> {
  try {
    const row = await prisma.llmResponseCache.findUnique({ where: { cacheKey } });
    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.llmResponseCache.delete({ where: { cacheKey } }).catch(() => undefined);
      return null;
    }
    return { content: row.responseJson, model: row.model };
  } catch {
    return null;
  }
}

export async function setLlmCache(input: {
  cacheKey: string;
  provider: string;
  model: string;
  taskType: string;
  promptHash: string;
  requestJson: unknown;
  responseJson: unknown;
}): Promise<void> {
  const ttl = getLlmConfig().cacheTtlSeconds;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  try {
    await prisma.llmResponseCache.upsert({
      where: { cacheKey: input.cacheKey },
      create: {
        cacheKey: input.cacheKey,
        provider: input.provider,
        model: input.model,
        taskType: input.taskType,
        promptHash: input.promptHash,
        requestJson: input.requestJson as object,
        responseJson: input.responseJson as object,
        expiresAt,
      },
      update: {
        provider: input.provider,
        model: input.model,
        taskType: input.taskType,
        promptHash: input.promptHash,
        requestJson: input.requestJson as object,
        responseJson: input.responseJson as object,
        expiresAt,
      },
    });
  } catch {
    // Cache is best-effort
  }
}
