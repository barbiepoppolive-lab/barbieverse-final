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

// ── Provider cooldowns (account-level 429s) ────────────
//
// Our own counters only know about requests WE made since the last restart.
// They can't see an account-level cap the upstream provider is enforcing —
// e.g. OpenRouter's "free-models-per-day-high-balance", which rejects every
// free model on the account regardless of which one you ask for.
//
// That distinction matters. A model-level failure should hop to another model;
// an account-level failure means the entire provider is unusable and hopping
// just burns retries against the same wall. When we see one, park the whole
// provider until its window resets.
const cooldownUntil: Partial<Record<Provider, number>> = {};

/** Default cooldown when the provider gives us no reset hint. */
const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Sideline a provider after an account-level rejection.
 *
 * `resetAtMs` accepts an absolute epoch ms if the provider told us when the
 * limit lifts; otherwise a conservative default applies. Daily caps park the
 * provider until UTC midnight, since retrying sooner is pointless.
 */
export function markProviderRateLimited(
  provider: Provider,
  opts?: { daily?: boolean; resetAtMs?: number; reason?: string },
): void {
  const until =
    opts?.resetAtMs ??
    (opts?.daily ? getResetTime() : Date.now() + DEFAULT_COOLDOWN_MS);

  cooldownUntil[provider] = until;
  console.warn(
    `[rate-limiter] ${provider} sidelined until ${new Date(until).toISOString()}` +
      (opts?.reason ? ` — ${opts.reason}` : ""),
  );
}

/** Remaining cooldown in ms, or 0 if the provider is usable. */
export function cooldownRemaining(provider: Provider): number {
  const until = cooldownUntil[provider];
  if (!until) return 0;
  const left = until - Date.now();
  if (left <= 0) {
    delete cooldownUntil[provider];
    return 0;
  }
  return left;
}

/**
 * Classify an upstream error as an account-level rate limit.
 *
 * Deliberately broad on the message, because these strings vary by provider
 * and change without notice. A false positive costs one hour on a fallback
 * provider; a false negative costs every request until someone notices.
 */
export function isAccountRateLimit(err: unknown): { hit: boolean; daily: boolean } {
  const msg = (
    typeof err === "string" ? err : ((err as any)?.message ?? "")
  ).toLowerCase();
  const status = (err as any)?.status ?? (err as any)?.statusCode;

  const looks429 = status === 429 || msg.includes("429") || msg.includes("too many requests");
  if (!looks429) return { hit: false, daily: false };

  const daily =
    msg.includes("per-day") ||
    msg.includes("per day") ||
    msg.includes("daily") ||
    msg.includes("free-models-per-day");

  return { hit: true, daily };
}

export function isRateLimited(provider: Provider): boolean {
  if (!isAvailable(provider)) return true;
  if (cooldownRemaining(provider) > 0) return true;
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
