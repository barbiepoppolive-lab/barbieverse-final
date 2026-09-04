// Simple in-memory rate limiter for server functions.
// Tracks request counts per key (IP or phone) with a sliding window.
// Not distributed — for multi-instance deployments, use Redis or Supabase.

interface RateEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateEntry>();

/**
 * Check if a key is within the rate limit.
 * @param key   Identifier (IP address, phone number, etc.)
 * @param max   Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/**
 * Get the client IP from a TanStack Start request context.
 * Falls back to "unknown" if headers aren't available.
 */
export function getClientIp(headers?: Headers): string {
  if (!headers) return "unknown";
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}
