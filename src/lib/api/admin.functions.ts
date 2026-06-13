import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// ── In-memory rate limiter (per-IP) ────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { ok: true } | { ok: false; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { ok: false, remaining: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true };
}

function getClientIp(): string {
  try {
    const req = getRequest();
    return req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers?.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const rate = checkRateLimit(ip);
    if (!rate.ok) {
      return { ok: false, error: `Too many attempts. Try again in ${rate.remaining} seconds.` };
    }

    const { getAdminSession } = await import("../admin-session.server");
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false, error: "Admin password not configured" };

    // Timing-safe comparison (Node.js crypto only available server-side)
    const crypto = await import("node:crypto");
    const { timingSafeEqual } = crypto.default || crypto;

    const bufA = Buffer.from(data.password);
    const bufB = Buffer.from(expected);
    const maxLen = Math.max(bufA.length, bufB.length);
    const padA = Buffer.alloc(maxLen, bufA);
    const padB = Buffer.alloc(maxLen, bufB);
    const match = timingSafeEqual(padA, padB);

    if (!match) {
      return { ok: false, error: "Wrong password" };
    }

    const session = await getAdminSession();
    await session.update({ isAdmin: true, loggedInAt: Date.now() });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("../admin-session.server");
  const session = await getAdminSession();
  await session.clear();
  return { ok: true };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("../admin-session.server");
  const session = await getAdminSession();
  return { isAdmin: !!session.data?.isAdmin };
});
