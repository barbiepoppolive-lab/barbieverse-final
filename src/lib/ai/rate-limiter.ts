// Rate Limiter — Tracks daily usage per provider
// Provider type derived from registry, not hardcoded.

import { type Provider, PROVIDER_REGISTRY, isAvailable } from "./providers";

export type { Provider };

interface RateLimitConfig {
  rpm: number;
  rpd: number;
  tpm: number;
}

// Derive limits from registry
function getProviderLimits(): Record<Provider, RateLimitConfig> {
  const limits: any = {};
  for (const [name, config] of Object.entries(PROVIDER_REGISTRY)) {
    limits[name] = config.limits;
  }
  return limits;
}

const PROVIDER_LIMITS = getProviderLimits();

interface UsageRecord {
  count: number;
  tokens: number;
  resetAt: number;
}

// In-memory usage tracker (resets on server restart)
const usage: Record<string, UsageRecord> = {};

function getRecord(provider: Provider): UsageRecord {
  if (!usage[provider]) {
    usage[provider] = { count: 0, tokens: 0, resetAt: getResetTime() };
  }
  return usage[provider];
}

function getResetTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.getTime();
}

function maybeReset(provider: Provider): void {
  const record = getRecord(provider);
  if (Date.now() >= record.resetAt) {
    usage[provider] = { count: 0, tokens: 0, resetAt: getResetTime() };
  }
}

export function isRateLimited(provider: Provider): boolean {
  if (!isAvailable(provider)) return true;
  maybeReset(provider);
  const limits = PROVIDER_LIMITS[provider];
  if (!limits) return true;
  const record = getRecord(provider);
  return record.count >= limits.rpd || record.tokens >= limits.tpm;
}

export function trackUsage(provider: Provider, tokens: number): void {
  maybeReset(provider);
  const record = getRecord(provider);
  record.count++;
  record.tokens += tokens;
}

export function getUsage(provider: Provider): {
  requests: number;
  tokens: number;
  limits: RateLimitConfig;
  remaining: number;
} {
  maybeReset(provider);
  const limits = PROVIDER_LIMITS[provider] || { rpm: 0, rpd: 0, tpm: 0 };
  const record = getRecord(provider);
  return {
    requests: record.count,
    tokens: record.tokens,
    limits,
    remaining: limits.rpd - record.count,
  };
}

export function getAllUsage(): Record<Provider, ReturnType<typeof getUsage>> {
  const result: any = {};
  for (const name of Object.keys(PROVIDER_REGISTRY) as Provider[]) {
    result[name] = getUsage(name);
  }
  return result;
}

export function getLimits(provider: Provider): RateLimitConfig {
  return PROVIDER_LIMITS[provider] || { rpm: 0, rpd: 0, tpm: 0 };
}
