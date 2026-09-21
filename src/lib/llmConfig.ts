export type LlmConfig = {
  provider: "none" | "mock" | "openai";
  enabledForBriefs: boolean;
  maxAccountsPerRun: number;
  cacheTtlSeconds: number;
  model: string;
};

export function getLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER ?? "none").toLowerCase() as LlmConfig["provider"];
  return {
    provider: ["none", "mock", "openai"].includes(provider) ? provider : "none",
    enabledForBriefs: (process.env.LLM_ENABLED_FOR_BRIEFS ?? "true").toLowerCase() !== "false",
    maxAccountsPerRun: Number(process.env.LLM_MAX_ACCOUNTS_PER_RUN ?? 5),
    cacheTtlSeconds: Number(process.env.LLM_CACHE_TTL_SECONDS ?? 86400),
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}
