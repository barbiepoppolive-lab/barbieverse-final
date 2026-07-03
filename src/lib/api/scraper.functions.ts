// Scraper Server Functions — Multi-platform lead scraping API

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PhantombusterScraper } from "@/lib/scraper/providers/phantombuster";
import { ApifyScraper } from "@/lib/scraper/providers/apify";
import { importFromFile, getCSVTemplate, type ImportResult } from "@/lib/scraper/providers/csv-import";
import type { Platform, ScrapeTarget, ScrapedProfile, ScrapedPost } from "@/lib/scraper/scraper-abstraction";
import { detectPlatform } from "@/lib/scraper/scraper-abstraction";

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl:
        process.env.DB_SSL_INSECURE === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return dbPool;
}

function getScraper(provider: "phantombuster" | "apify") {
  if (provider === "phantombuster") return new PhantombusterScraper();
  return new ApifyScraper();
}

// ── Get Scraping Dashboard Stats ───────────────────────

export const getScraperDashboard = createServerFn({
  method: "GET",
  validator: z.object({}).optional(),
}).handler(async () => {
  const db = await getDb();

  const [jobsResult, resultsResult, platformResult, recentJobs] = await Promise.all([
    db.query(`SELECT status, COUNT(*) as count FROM scrape_jobs GROUP BY status`),
    db.query(`SELECT platform, COUNT(*) as count FROM scrape_results GROUP BY platform`),
    db.query(`
      SELECT platform, 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE imported_to_leads = true) as imported
      FROM scrape_results 
      GROUP BY platform
    `),
    db.query(`
      SELECT id, provider, platform, target, status, result_count, cost_usd, 
             created_at, completed_at
      FROM scrape_jobs 
      ORDER BY created_at DESC 
      LIMIT 20
    `),
  ]);

  const statusCounts = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const row of jobsResult.rows) {
    statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
  }

  const platformCounts: Record<string, number> = {};
  for (const row of resultsResult.rows) {
    platformCounts[row.platform] = parseInt(row.count);
  }

  return {
    statusCounts,
    platformCounts,
    platformImport: platformResult.rows,
    recentJobs: recentJobs.rows,
    totalJobs: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    totalResults: Object.values(platformCounts).reduce((a, b) => a + b, 0),
  };
});

// ── Run a Scrape Job ───────────────────────────────────

export const runScrapeJob = createServerFn({
  method: "POST",
  validator: z.object({
    provider: z.enum(["phantombuster", "apify"]),
    platform: z.enum(["instagram", "facebook", "twitter", "youtube", "telegram"]),
    target: z.enum(["profiles", "posts", "reels", "stories", "comments", "followers", "following", "hashtags", "channels", "videos", "shorts"]),
    urls: z.array(z.string()).min(1),
    limit: z.number().optional().default(20),
  }),
}).handler(async ({ data }) => {
  const db = await getDb();
  const scraper = getScraper(data.provider);

  if (!scraper.isConfigured()) {
    throw new Error(`${data.provider.toUpperCase()} API key not configured`);
  }

  // Create job record
  const jobResult = await db.query(
    `INSERT INTO scrape_jobs (provider, platform, target, status, input, created_at)
     VALUES ($1, $2, $3, 'running', $4, NOW())
     RETURNING id`,
    [data.provider, data.platform, data.target, JSON.stringify({ urls: data.urls, limit: data.limit })]
  );
  const jobId = jobResult.rows[0].id;

  try {
    let results: (ScrapedProfile | ScrapedPost)[] = [];

    if (data.target === "profiles" || data.target === "followers" || data.target === "channels") {
      results = await scraper.scrapeProfiles(data.platform, data.urls);
    } else if (data.target === "posts" || data.target === "videos" || data.target === "reels") {
      results = await scraper.scrapePosts!(data.platform, data.urls, data.limit);
    }

    // Store results
    for (const item of results) {
      const p = item as ScrapedProfile;
      const post = item as ScrapedPost;

      if ("username" in item && p.username) {
        await db.query(
          `INSERT INTO scrape_results (job_id, platform, item_type, username, display_name, bio, 
           followers, following, posts_count, is_verified, is_business, email, profile_pic_url, 
           external_url, raw_data)
           VALUES ($1, $2, 'profile', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            jobId, data.platform, p.username, p.display_name, p.bio,
            p.followers, p.following, p.posts_count, p.is_verified, p.is_business,
            p.email, p.profile_pic_url, p.external_url, JSON.stringify(p.raw_data || {}),
          ]
        );
      } else if ("text" in item || "id" in item) {
        await db.query(
          `INSERT INTO scrape_results (job_id, platform, item_type, post_text, likes, 
           comments_count, shares_count, views_count, media_url, media_type, hashtags, 
           item_url, raw_data)
           VALUES ($1, $2, 'post', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            jobId, data.platform, post.text, post.likes, post.comments_count,
            post.shares_count, post.views_count, post.media_url, post.media_type,
            post.hashtags, post.url, JSON.stringify(post.raw_data || {}),
          ]
        );
      }
    }

    // Update job
    await db.query(
      `UPDATE scrape_jobs SET status = 'completed', result_count = $1, completed_at = NOW() WHERE id = $2`,
      [results.length, jobId]
    );

    return { jobId, resultCount: results.length };
  } catch (err: any) {
    await db.query(
      `UPDATE scrape_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, jobId]
    );
    throw err;
  }
});

// ── Import from File Content ───────────────────────────

export const importFromCSV = createServerFn({
  method: "POST",
  validator: z.object({
    content: z.string(),
    filename: z.string(),
    platformHint: z.enum(["instagram", "facebook", "twitter", "youtube", "telegram"]).optional(),
  }),
}).handler(async ({ data }) => {
  const result = await importFromFile(data.content, data.filename, data.platformHint);
  return result;
});

// ── Import Results to Leads Table ──────────────────────

export const importResultsToLeads = createServerFn({
  method: "POST",
  validator: z.object({
    jobIds: z.array(z.string()),
  }),
}).handler(async ({ data }) => {
  const db = await getDb();

  let imported = 0;
  let skipped = 0;

  for (const jobId of data.jobIds) {
    const results = await db.query(
      `SELECT * FROM scrape_results WHERE job_id = $1 AND item_type = 'profile' AND imported_to_leads = false`,
      [jobId]
    );

    for (const row of results.rows) {
      try {
        // Check if lead already exists by username
        const existing = await db.query(
          `SELECT id FROM leads WHERE username = $1 AND platform = $2`,
          [row.username, row.platform]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        await db.query(
          `INSERT INTO leads (username, display_name, bio, followers, following, posts_count,
           is_verified, is_business, email, profile_pic_url, external_url, platform, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            row.username, row.display_name, row.bio, row.followers, row.following,
            row.posts_count, row.is_verified, row.is_business, row.email,
            row.profile_pic_url, row.external_url, row.platform,
            `scrape_${jobId.slice(0, 8)}`,
          ]
        );

        await db.query(
          `UPDATE scrape_results SET imported_to_leads = true WHERE id = $1`,
          [row.id]
        );

        imported++;
      } catch (err: any) {
        console.error(`Failed to import ${row.username}:`, err.message);
        skipped++;
      }
    }
  }

  // Auto-score newly imported creator leads
  if (imported > 0) {
    try {
      const { autoScoreNewLeads } = await import("@/lib/automation/scraper-cron");
      autoScoreNewLeads().catch((err) =>
        console.error("[scraper] Auto-score failed:", err.message)
      );
    } catch (e) {
      // Non-critical, don't block
    }
  }

  return { imported, skipped };
});

// ── Get Scrape Job Results ─────────────────────────────

export const getScrapeJobResults = createServerFn({
  method: "GET",
  validator: z.object({
    jobId: z.string(),
    itemType: z.enum(["profile", "post", "comment"]).optional(),
    limit: z.number().optional().default(100),
  }),
}).handler(async ({ data }) => {
  const db = await getDb();

  let query = `SELECT * FROM scrape_results WHERE job_id = $1`;
  const params: any[] = [data.jobId];

  if (data.itemType) {
    query += ` AND item_type = $${params.length + 1}`;
    params.push(data.itemType);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(data.limit);

  const result = await db.query(query, params);
  return result.rows;
});

// ── Delete Scrape Job ──────────────────────────────────

export const deleteScrapeJob = createServerFn({
  method: "POST",
  validator: z.object({ jobId: z.string() }),
}).handler(async ({ data }) => {
  const db = await getDb();
  await db.query(`DELETE FROM scrape_jobs WHERE id = $1`, [data.jobId]);
  return { success: true };
});

// ── Get CSV Template ───────────────────────────────────

export const getCSVImportTemplate = createServerFn({
  method: "GET",
  validator: z.object({
    platform: z.enum(["instagram", "facebook", "twitter", "youtube", "telegram"]),
  }),
}).handler(async ({ data }) => {
  return { template: getCSVTemplate(data.platform) };
});

// ── Get Provider Status ────────────────────────────────

export const getProviderStatus = createServerFn({
  method: "GET",
  validator: z.object({}).optional(),
}).handler(async () => {
  const pb = new PhantombusterScraper();
  const apify = new ApifyScraper();

  return {
    phantombuster: pb.isConfigured(),
    apify: apify.isConfigured(),
  };
});
