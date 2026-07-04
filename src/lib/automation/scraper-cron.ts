// Scheduled Scraper — Cron-based auto-scrape system
// Run via external cron (cron-job.org) hitting /api/public/cron-scrape
// Or call runScheduledScrapes() from any server function

import { ApifyScraper } from "@/lib/scraper/providers/apify";
import { PhantombusterScraper } from "@/lib/scraper/providers/phantombuster";
import type { Platform, ScrapedProfile } from "@/lib/scraper/scraper-abstraction";

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: process.env.DB_SSL_INSECURE === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return dbPool;
}

export interface ScrapeSchedule {
  id: string;
  name: string;
  provider: "apify" | "phantombuster";
  platform: Platform;
  target: string;
  urls: string[];
  limit: number;
  cron_expr: string; // e.g. "0 9 * * *" = daily at 9am
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

// ── Get All Schedules ──────────────────────────────────

export async function getScrapeSchedules(): Promise<ScrapeSchedule[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM scrape_schedules ORDER BY created_at DESC`
  );
  return result.rows.map((r: any) => ({
    ...r,
    urls: JSON.parse(r.urls || "[]"),
  }));
}

// ── Create Schedule ────────────────────────────────────

export async function createScrapeSchedule(
  schedule: Omit<ScrapeSchedule, "id" | "last_run_at" | "next_run_at">
): Promise<ScrapeSchedule> {
  const db = await getDb();
  const result = await db.query(
    `INSERT INTO scrape_schedules (name, provider, platform, target, urls, "limit", cron_expr, enabled, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      schedule.name,
      schedule.provider,
      schedule.platform,
      schedule.target,
      JSON.stringify(schedule.urls),
      schedule.limit,
      schedule.cron_expr,
      schedule.enabled,
    ]
  );
  return { ...result.rows[0], urls: JSON.parse(result.rows[0].urls || "[]") };
}

// ── Delete Schedule ────────────────────────────────────

export async function deleteScrapeSchedule(id: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM scrape_schedules WHERE id = $1`, [id]);
}

// ── Toggle Schedule ────────────────────────────────────

export async function toggleScrapeSchedule(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.query(`UPDATE scrape_schedules SET enabled = $1 WHERE id = $2`, [enabled, id]);
}

// ── Check if schedule should run ───────────────────────
// Simple cron matcher — supports "0 9 * * *" (daily at 9am UTC)

function shouldRunNow(cronExpr: string, lastRunAt?: string): boolean {
  const now = new Date();
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) return false;

  const [minute, hour, , , ] = parts;

  // Check hour and minute match
  const currentMinute = now.getUTCMinutes();
  const currentHour = now.getUTCHours();

  if (minute !== "*" && parseInt(minute) !== currentMinute) return false;
  if (hour !== "*" && parseInt(hour) !== currentHour) return false;

  // Don't run if already ran in last 30 minutes
  if (lastRunAt) {
    const lastRun = new Date(lastRunAt);
    const diffMs = now.getTime() - lastRun.getTime();
    if (diffMs < 30 * 60 * 1000) return false;
  }

  return true;
}

// ── Execute a Single Schedule ──────────────────────────

async function executeSchedule(schedule: ScrapeSchedule): Promise<{
  jobId: string;
  resultCount: number;
  error?: string;
}> {
  const db = await getDb();

  // Create job record
  const jobResult = await db.query(
    `INSERT INTO scrape_jobs (provider, platform, target, status, input, created_at)
     VALUES ($1, $2, $3, 'running', $4, NOW())
     RETURNING id`,
    [
      schedule.provider,
      schedule.platform,
      schedule.target,
      JSON.stringify({ schedule_id: schedule.id, urls: schedule.urls, limit: schedule.limit }),
    ]
  );
  const jobId = jobResult.rows[0].id;

  try {
    const scraper = schedule.provider === "phantombuster"
      ? new PhantombusterScraper()
      : new ApifyScraper();

    if (!scraper.isConfigured()) {
      throw new Error(`${schedule.provider.toUpperCase()} API key not configured`);
    }

    let results: ScrapedProfile[] = [];

    if (schedule.target === "profiles" || schedule.target === "followers" || schedule.target === "channels") {
      results = await scraper.scrapeProfiles(schedule.platform, schedule.urls);
    } else {
      const posts = await scraper.scrapePosts!(schedule.platform, schedule.urls, schedule.limit);
      // Store posts too
      for (const post of posts) {
        await db.query(
          `INSERT INTO scrape_results (job_id, platform, item_type, post_text, likes, 
           comments_count, views_count, media_url, item_url, raw_data)
           VALUES ($1, $2, 'post', $3, $4, $5, $6, $7, $8, $9)`,
          [
            jobId, schedule.platform, post.text, post.likes, post.comments_count,
            post.views_count, post.media_url, post.url, JSON.stringify(post.raw_data || {}),
          ]
        );
      }
    }

    // Store profile results
    for (const profile of results) {
      await db.query(
        `INSERT INTO scrape_results (job_id, platform, item_type, username, display_name, bio,
         followers, following, posts_count, is_verified, is_business, email, profile_pic_url,
         external_url, raw_data)
         VALUES ($1, $2, 'profile', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          jobId, schedule.platform, profile.username, profile.display_name, profile.bio,
          profile.followers, profile.following, profile.posts_count, profile.is_verified,
          profile.is_business, profile.email, profile.profile_pic_url, profile.external_url,
          JSON.stringify(profile.raw_data || {}),
        ]
      );
    }

    // Update job
    await db.query(
      `UPDATE scrape_jobs SET status = 'completed', result_count = $1, completed_at = NOW() WHERE id = $2`,
      [results.length, jobId]
    );

    // Update schedule last_run_at
    await db.query(
      `UPDATE scrape_schedules SET last_run_at = NOW() WHERE id = $1`,
      [schedule.id]
    );

    return { jobId, resultCount: results.length };
  } catch (err: any) {
    await db.query(
      `UPDATE scrape_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, jobId]
    );

    // Update schedule last_run_at even on failure
    await db.query(
      `UPDATE scrape_schedules SET last_run_at = NOW() WHERE id = $1`,
      [schedule.id]
    );

    return { jobId, resultCount: 0, error: err.message };
  }
}

// ── Run All Due Schedules (called by cron endpoint) ────

export async function runScheduledScrapes(): Promise<{
  executed: number;
  results: Array<{ scheduleId: string; name: string; jobId: string; resultCount: number; error?: string }>;
}> {
  const schedules = await getScrapeSchedules();
  const executed: Array<{ scheduleId: string; name: string; jobId: string; resultCount: number; error?: string }> = [];

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    if (!shouldRunNow(schedule.cron_expr, schedule.last_run_at)) continue;

    console.log(`[scraper-cron] Running schedule: ${schedule.name} (${schedule.id})`);
    const result = await executeSchedule(schedule);
    executed.push({
      scheduleId: schedule.id,
      name: schedule.name,
      ...result,
    });
  }

  return { executed: executed.length, results: executed };
}

// ── Auto-Score New Scraped Leads ───────────────────────

export async function autoScoreNewLeads(): Promise<{
  scored: number;
  errors: number;
}> {
  const db = await getDb();

  // Find recently imported leads without scores
  const unscored = await db.query(`
    SELECT cl.id FROM creator_leads cl
    LEFT JOIN lead_scores ls ON cl.id = ls.lead_id
    WHERE ls.id IS NULL
    ORDER BY cl.created_at DESC
    LIMIT 20
  `);

  if (unscored.rows.length === 0) return { scored: 0, errors: 0 };

  let scored = 0;
  let errors = 0;

  for (const row of unscored.rows) {
    try {
      const { scoreCreatorLead } = await import("@/lib/api/scout-ai.functions");
      await scoreCreatorLead({ data: { lead_id: row.id } });
      scored++;
    } catch (err: any) {
      console.error(`[auto-score] Failed to score ${row.id}:`, err.message);
      errors++;
    }
  }

  return { scored, errors };
}

// ── Send Telegram Alert ────────────────────────────────

export async function sendAutomationAlert(text: string): Promise<void> {
  const botToken = process.env.CONTENT_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.CONTENT_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[automation-alert] Send failed:", err);
  }
}
