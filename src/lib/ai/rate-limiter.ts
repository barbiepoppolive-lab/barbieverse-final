// Rate Limiter — Tracks daily usage per provider
// Resets at midnight UTC

export type Provider =
  | "gemini"
  | "groq"
  | "mistral"
  | "cerebras"
  | "ollama"
  | "anthropic"
  | "openrouter";

interface RateLimitConfig {
  rpm: number;
  rpd: number;
  tpm: number;
}

const PROVIDER_LIMITS: Record<Provider, RateLimitConfig> = {
  gemini: { rpm: 10, rpd: 250, tpm: 250_000 },
  groq: { rpm: 30, rpd: 14_400, tpm: 12_000 },
  mistral: { rpm: 2, rpd: 999_999, tpm: 500_000 },
  cerebras: { rpm: 30, rpd: 1000, tpm: 100_000 },
  ollama: { rpm: 999, rpd: 999_999, tpm: 999_999 },
  anthropic: { rpm: 50, rpd: 1000, tpm: 40_000 },
  openrouter: { rpm: 20, rpd: 1000, tpm: 200_000 },
};

interface UsageRecord {
  count: number;
  tokens: number;
  resetAt: number;
}

// In-memory usage tracker (resets on server restart)
const usage: Record<Provider, UsageRecord> = {
  gemini: { count: 0, tokens: 0, resetAt: getResetTime() },
  groq: { count: 0, tokens: 0, resetAt: getResetTime() },
  mistral: { count: 0, tokens: 0, resetAt: getResetTime() },
  cerebras: { count: 0, tokens: 0, resetAt: getResetTime() },
  ollama: { count: 0, tokens: 0, resetAt: getResetTime() },
  anthropic: { count: 0, tokens: 0, resetAt: getResetTime() },
  openrouter: { count: 0, tokens: 0, resetAt: getResetTime() },
};

function getResetTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.getTime();
}

function maybeReset(provider: Provider): void {
  if (Date.now() >= usage[provider].resetAt) {
    usage[provider] = { count: 0, tokens: 0, resetAt: getResetTime() };
  }
}

export function isRateLimited(provider: Provider): boolean {
  maybeReset(provider);
  const limits = PROVIDER_LIMITS[provider];
  return usage[provider].count >= limits.rpd;
}

export function trackUsage(provider: Provider, tokens: number): void {
  maybeReset(provider);
  usage[provider].count++;
  usage[provider].tokens += tokens;
}

export function getUsage(provider: Provider): {
  requests: number;
  tokens: number;
  limits: RateLimitConfig;
  remaining: number;
} {
  maybeReset(provider);
  return {
    requests: usage[provider].count,
    tokens: usage[provider].tokens,
    limits: PROVIDER_LIMITS[provider],
    remaining: PROVIDER_LIMITS[provider].rpd - usage[provider].count,
  };
}

export function getAllUsage(): Record<Provider, ReturnType<typeof getUsage>> {
  return {
    gemini: getUsage("gemini"),
    groq: getUsage("groq"),
    mistral: getUsage("mistral"),
    cerebras: getUsage("cerebras"),
    ollama: getUsage("ollama"),
    anthropic: getUsage("anthropic"),
    openrouter: getUsage("openrouter"),
  };
}

export function getLimits(provider: Provider): RateLimitConfig {
  return PROVIDER_LIMITS[provider];
}
