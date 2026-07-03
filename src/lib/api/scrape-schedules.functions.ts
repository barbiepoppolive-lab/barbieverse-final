// Scrape Schedules Server Functions — CRUD for scrape schedules

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getScrapeSchedules,
  createScrapeSchedule,
  deleteScrapeSchedule,
  toggleScrapeSchedule,
  type ScrapeSchedule,
} from "@/lib/automation/scraper-cron";

// ── List Schedules ─────────────────────────────────────

export const listScrapeSchedules = createServerFn({
  method: "GET",
  validator: z.object({}).optional(),
}).handler(async () => {
  return getScrapeSchedules();
});

// ── Create Schedule ────────────────────────────────────

export const createSchedule = createServerFn({
  method: "POST",
  validator: z.object({
    name: z.string().min(1),
    provider: z.enum(["apify", "phantombuster"]),
    platform: z.enum(["instagram", "facebook", "twitter", "youtube", "telegram"]),
    target: z.enum(["profiles", "posts", "reels", "followers", "hashtags", "channels", "videos"]),
    urls: z.array(z.string()).min(1),
    limit: z.number().int().min(1).max(1000).default(20),
    cron_expr: z.string().default("0 9 * * *"),
    enabled: z.boolean().default(true),
  }),
}).handler(async ({ data }) => {
  return createScrapeSchedule(data);
});

// ── Delete Schedule ────────────────────────────────────

export const deleteSchedule = createServerFn({
  method: "POST",
  validator: z.object({ id: z.string() }),
}).handler(async ({ data }) => {
  await deleteScrapeSchedule(data.id);
  return { success: true };
});

// ── Toggle Schedule ────────────────────────────────────

export const toggleSchedule = createServerFn({
  method: "POST",
  validator: z.object({
    id: z.string(),
    enabled: z.boolean(),
  }),
}).handler(async ({ data }) => {
  await toggleScrapeSchedule(data.id, data.enabled);
  return { success: true };
});
