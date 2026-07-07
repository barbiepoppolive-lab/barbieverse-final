export * from "./types";
export * from "./facebook";
export * from "./reddit";
export * from "./twitter";
export * from "./youtube";
export * from "./instagram";
export * from "./tiktok";
export * from "./ai-comment";
export * from "./telegram-alert";
export * from "./keyword-intel";

import { monitorFacebook } from "./facebook";
import { monitorReddit } from "./reddit";
import { monitorTwitter } from "./twitter";
import { monitorYouTube } from "./youtube";
import { monitorInstagram } from "./instagram";
import { monitorTikTok } from "./tiktok";
import { generateComment } from "./ai-comment";
import { sendSocialLeadAlert, sendSocialDigest } from "./telegram-alert";
import { DEFAULT_MONITOR_CONFIG, loadMonitorConfig } from "./types";
import type { SocialPost, SocialPlatform, MonitorConfig } from "./types";
import {
  scoreKeywordAfterDiscovery,
  selectKeywordsForPlatform,
  ingestDiscoveryKeywords,
  evolveKeywords,
} from "./keyword-intel";
import type { GeneratedComment } from "./ai-comment";

// ── Timeout helper ──────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const PLATFORM_TIMEOUT = 60_000;

// ── Last run tracking (per-platform intervals) ─────────

async function getLastRunAt(platform: SocialPlatform): Promise<Date | null> {
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ value: string }>(
      `SELECT value FROM settings WHERE key = $1`,
      [`social_last_run_${platform}`]
    );
    if (rows.length > 0 && rows[0].value) {
      return new Date(rows[0].value);
    }
    return null;
  } catch {
    return null;
  }
}

async function setLastRunAt(platform: SocialPlatform): Promise<void> {
  try {
    const { q } = await import("@/lib/db.server");
    await q(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [`social_last_run_${platform}`, new Date().toISOString()]
    );
  } catch (e: any) {
    console.error(`[social-monitor] Failed to update last_run_at for ${platform}:`, e?.message);
  }
}

async function shouldRunPlatform(
  platform: SocialPlatform,
  intervalHours: number
): Promise<boolean> {
  const lastRun = await getLastRunAt(platform);
  if (!lastRun) return true;

  const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun >= intervalHours;
}

// ── Database: store a raw discovered post (no AI) ──────

async function storeDiscoveredPost(post: SocialPost): Promise<string | null> {
  const { q } = await import("@/lib/db.server");

  const existing = await q<{ id: string }>(
    `SELECT id FROM social_leads WHERE post_url = $1 LIMIT 1`,
    [post.postUrl]
  );

  if (existing.length > 0) return existing[0].id;

  const engagementScore = post.likes + post.comments + post.shares;

  const result = await q<{ id: string }>(
    `INSERT INTO social_leads (
      platform, post_url, post_text, author_name, author_username,
      author_profile_url, keyword_matched, subreddit, group_name,
      engagement_score, status, discovered_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'discovered',now())
    RETURNING id`,
    [
      post.platform,
      post.postUrl,
      post.postText,
      post.authorName,
      post.authorUsername,
      post.authorProfileUrl,
      post.keywordMatched,
      post.subreddit || null,
      post.groupName || null,
      engagementScore,
    ]
  );

  return result[0]?.id;
}

// ── Database: store with AI result ─────────────────────

async function storeSocialLead(post: SocialPost, aiResult: GeneratedComment) {
  const { q } = await import("@/lib/db.server");

  const existing = await q<{ id: string }>(
    `SELECT id FROM social_leads WHERE post_url = $1 LIMIT 1`,
    [post.postUrl]
  );

  if (existing.length > 0) {
    // Update existing lead with AI results
    await q(
      `UPDATE social_leads SET
        ai_generated_comment = $2, ai_confidence = $3, ai_category = $4,
        extracted_hashtags = $5, extracted_mentions = $6,
        extracted_niche = $7, extracted_tier = $8,
        status = 'ai_reviewed', updated_at = now()
       WHERE post_url = $1`,
      [
        post.postUrl,
        aiResult.comment,
        aiResult.confidence,
        aiResult.category,
        aiResult.hashtags,
        aiResult.mentions,
        aiResult.niche,
        aiResult.tier,
      ]
    );
    return existing[0].id;
  }

  const engagementScore = post.likes + post.comments + post.shares;

  const result = await q<{ id: string }>(
    `INSERT INTO social_leads (
      platform, post_url, post_text, author_name, author_username,
      author_profile_url, keyword_matched, subreddit, group_name,
      engagement_score, ai_generated_comment, ai_confidence, ai_category,
      extracted_hashtags, extracted_mentions, extracted_niche, extracted_tier,
      status, discovered_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())
    RETURNING id`,
    [
      post.platform,
      post.postUrl,
      post.postText,
      post.authorName,
      post.authorUsername,
      post.authorProfileUrl,
      post.keywordMatched,
      post.subreddit || null,
      post.groupName || null,
      engagementScore,
      aiResult.comment,
      aiResult.confidence,
      aiResult.category,
      aiResult.hashtags,
      aiResult.mentions,
      aiResult.niche,
      aiResult.tier,
      aiResult.comment ? "ai_reviewed" : "discovered",
    ]
  );

  return result[0]?.id;
}

// ── Load tiered intervals from settings ────────────────

async function loadTieredIntervals(): Promise<Record<SocialPlatform, number>> {
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key LIKE 'scraper_interval_%'`
    );

    const db: Record<string, string> = {};
    for (const row of rows) {
      db[row.key] = row.value || "";
    }

    return {
      youtube: parseFloat(db.scraper_interval_youtube || "0.5"),
      reddit: parseFloat(db.scraper_interval_reddit || "0.5"),
      twitter: parseFloat(db.scraper_interval_twitter || "2"),
      tiktok: parseFloat(db.scraper_interval_tiktok || "6"),
      facebook: parseFloat(db.scraper_interval_facebook || "12"),
      instagram: parseFloat(db.scraper_interval_instagram || "12"),
    };
  } catch {
    return DEFAULT_MONITOR_CONFIG.platformIntervals;
  }
}

// ── Load platform enabled status from settings ─────────

async function loadPlatformEnabled(): Promise<Record<SocialPlatform, boolean>> {
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key LIKE 'scraper_enabled_%'`
    );

    const db: Record<string, string> = {};
    for (const row of rows) {
      db[row.key] = row.value || "";
    }

    return {
      youtube: db.scraper_enabled_youtube !== "false",
      reddit: db.scraper_enabled_reddit !== "false",
      twitter: db.scraper_enabled_twitter !== "false",
      tiktok: db.scraper_enabled_tiktok !== "false",
      facebook: db.scraper_enabled_facebook !== "false",
      instagram: db.scraper_enabled_instagram !== "false",
    };
  } catch {
    return {
      youtube: true, reddit: true, twitter: true,
      tiktok: true, facebook: true, instagram: true,
    };
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 1: DISCOVER — fast, no AI, stores ALL posts
// ═══════════════════════════════════════════════════════

export interface DiscoveryResult {
  facebook: { found: number; stored: number; errors: number; skipped: boolean };
  reddit: { found: number; stored: number; errors: number; skipped: boolean };
  twitter: { found: number; stored: number; errors: number; skipped: boolean };
  youtube: { found: number; stored: number; errors: number; skipped: boolean };
  instagram: { found: number; stored: number; errors: number; skipped: boolean };
  tiktok: { found: number; stored: number; errors: number; skipped: boolean };
  totalDiscovered: number;
  totalStored: number;
}

export async function discoverAllPlatforms(config?: Partial<MonitorConfig>): Promise<DiscoveryResult> {
  const dbConfig = await loadMonitorConfig();
  const tieredIntervals = await loadTieredIntervals();
  const platformEnabled = await loadPlatformEnabled();
  const cfg = { ...dbConfig, ...config, platformIntervals: tieredIntervals };
  const intervals = cfg.platformIntervals;

  const results: DiscoveryResult = {
    facebook: { found: 0, stored: 0, errors: 0, skipped: false },
    reddit: { found: 0, stored: 0, errors: 0, skipped: false },
    twitter: { found: 0, stored: 0, errors: 0, skipped: false },
    youtube: { found: 0, stored: 0, errors: 0, skipped: false },
    instagram: { found: 0, stored: 0, errors: 0, skipped: false },
    tiktok: { found: 0, stored: 0, errors: 0, skipped: false },
    totalDiscovered: 0,
    totalStored: 0,
  };

  // Check which platforms should run based on tiered intervals AND enabled status
  const platformChecks = await Promise.all([
    shouldRunPlatform("youtube", intervals.youtube).then(r => r && platformEnabled.youtube),
    shouldRunPlatform("reddit", intervals.reddit).then(r => r && platformEnabled.reddit),
    shouldRunPlatform("twitter", intervals.twitter).then(r => r && platformEnabled.twitter),
    shouldRunPlatform("facebook", intervals.facebook).then(r => r && platformEnabled.facebook),
    shouldRunPlatform("instagram", intervals.instagram).then(r => r && platformEnabled.instagram),
    shouldRunPlatform("tiktok", intervals.tiktok).then(r => r && platformEnabled.tiktok),
  ]);

  const [runYT, runReddit, runTwitter, runFB, runIG, runTikTok] = platformChecks;

  results.youtube.skipped = !runYT;
  results.reddit.skipped = !runReddit;
  results.twitter.skipped = !runTwitter;
  results.facebook.skipped = !runFB;
  results.instagram.skipped = !runIG;
  results.tiktok.skipped = !runTikTok;

  // Run platforms that are due — use weighted keyword selection
  const fbResult = { posts: [] as SocialPost[], error: "" };
  const redditResult = { posts: [] as SocialPost[], error: "" };
  const twitterResult = { posts: [] as SocialPost[], error: "" };
  const ytResult = { posts: [] as SocialPost[], error: "" };
  const igResult = { posts: [] as SocialPost[], error: "" };
  const tiktokResult = { posts: [] as SocialPost[], error: "" };

  const promises: Promise<void>[] = [];

  if (runYT) {
    const kws = (await selectKeywordsForPlatform("youtube", 3)).length > 0
      ? await selectKeywordsForPlatform("youtube", 3)
      : cfg.youtubeQueries.slice(0, 2);
    promises.push(
      withTimeout(
        monitorYouTube(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "YouTube"
      ).then((p) => { ytResult.posts = p; }).catch((e) => { ytResult.error = e?.message || "unknown"; })
    );
  }

  if (runReddit) {
    const kws = (await selectKeywordsForPlatform("reddit", 3)).length > 0
      ? await selectKeywordsForPlatform("reddit", 3)
      : cfg.keywords.slice(0, 5);
    promises.push(
      withTimeout(
        monitorReddit(kws, cfg.redditSubreddits, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Reddit"
      ).then((p) => { redditResult.posts = p; }).catch((e) => { redditResult.error = e?.message || "unknown"; })
    );
  }

  if (runTwitter) {
    const kws = (await selectKeywordsForPlatform("twitter", 3)).length > 0
      ? await selectKeywordsForPlatform("twitter", 3)
      : cfg.twitterQueries.slice(0, 5);
    promises.push(
      withTimeout(
        monitorTwitter(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Twitter"
      ).then((p) => { twitterResult.posts = p; }).catch((e) => { twitterResult.error = e?.message || "unknown"; })
    );
  }

  if (runFB) {
    const kws = (await selectKeywordsForPlatform("facebook", 3)).length > 0
      ? await selectKeywordsForPlatform("facebook", 3)
      : cfg.facebookQueries.slice(0, 3);
    promises.push(
      withTimeout(
        monitorFacebook(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Facebook"
      ).then((p) => { fbResult.posts = p; }).catch((e) => { fbResult.error = e?.message || "unknown"; })
    );
  }

  if (runIG) {
    const kws = (await selectKeywordsForPlatform("instagram", 2)).length > 0
      ? await selectKeywordsForPlatform("instagram", 2)
      : cfg.instagramHashtags.slice(0, 2);
    promises.push(
      withTimeout(
        monitorInstagram(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Instagram"
      ).then((p) => { igResult.posts = p; }).catch((e) => { igResult.error = e?.message || "unknown"; })
    );
  }

  if (runTikTok) {
    const kws = (await selectKeywordsForPlatform("tiktok", 2)).length > 0
      ? await selectKeywordsForPlatform("tiktok", 2)
      : cfg.tiktokQueries.slice(0, 2);
    promises.push(
      withTimeout(
        monitorTikTok(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "TikTok"
      ).then((p) => { tiktokResult.posts = p; }).catch((e) => { tiktokResult.error = e?.message || "unknown"; })
    );
  }

  await Promise.allSettled(promises);

  // Update last_run_at for platforms that ran
  if (runYT) await setLastRunAt("youtube");
  if (runReddit) await setLastRunAt("reddit");
  if (runTwitter) await setLastRunAt("twitter");
  if (runFB) await setLastRunAt("facebook");
  if (runIG) await setLastRunAt("instagram");
  if (runTikTok) await setLastRunAt("tiktok");

  // Tally results
  const platformResults = [
    { key: "facebook", result: fbResult },
    { key: "reddit", result: redditResult },
    { key: "twitter", result: twitterResult },
    { key: "youtube", result: ytResult },
    { key: "instagram", result: igResult },
    { key: "tiktok", result: tiktokResult },
  ];

  for (const { key, result } of platformResults) {
    const r = results[key as keyof typeof results] as { found: number; stored: number; errors: number };
    r.found = result.posts.length;
    r.errors = result.error ? 1 : 0;
    if (result.error) console.error(`[social-monitor] ${key} error:`, result.error);
  }

  // Deduplicate across platforms
  const allPosts: SocialPost[] = [
    ...fbResult.posts,
    ...redditResult.posts,
    ...twitterResult.posts,
    ...ytResult.posts,
    ...igResult.posts,
    ...tiktokResult.posts,
  ];

  const seenUrls = new Set<string>();
  const uniquePosts: SocialPost[] = [];
  for (const post of allPosts) {
    if (!seenUrls.has(post.postUrl)) {
      seenUrls.add(post.postUrl);
      uniquePosts.push(post);
    }
  }

  // Filter by minimum engagement
  const noEngagementPlatforms = new Set(["youtube", "instagram", "tiktok"]);
  const filteredPosts = uniquePosts.filter(
    (p) => noEngagementPlatforms.has(p.platform) || (p.likes + p.comments + p.shares) >= cfg.minEngagement
  );

  // Store ALL posts as "discovered" (no AI)
  for (const post of filteredPosts) {
    try {
      const leadId = await storeDiscoveredPost(post);
      if (leadId) {
        results.totalStored++;
        const platformResult = results[post.platform];
        if (platformResult && typeof platformResult === "object" && "stored" in platformResult) {
          platformResult.stored++;
        }
      }
    } catch (e: any) {
      console.error(`[social-monitor] Error storing ${post.postUrl}:`, e?.message);
    }
  }

  results.totalDiscovered = filteredPosts.length;

  return results;
}

// ═══════════════════════════════════════════════════════
// PHASE 2: PROCESS — AI comments for batch of leads
// ═══════════════════════════════════════════════════════

export interface ProcessResult {
  processed: number;
  hotAlerts: number;
  warmAlerts: number;
  keywordsGenerated: number;
  errors: number;
}

export async function processDiscoveredLeads(batchSize: number = 20): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    hotAlerts: 0,
    warmAlerts: 0,
    keywordsGenerated: 0,
    errors: 0,
  };

  try {
    const { q } = await import("@/lib/db.server");

    // Get unprocessed leads ordered by engagement (highest first)
    const leads = await q<{
      id: string;
      platform: string;
      post_url: string;
      post_text: string;
      author_name: string;
      author_username: string;
      author_profile_url: string;
      keyword_matched: string;
      subreddit: string;
      group_name: string;
      engagement_score: number;
    }>(
      `SELECT id, platform, post_url, post_text, author_name, author_username,
              author_profile_url, keyword_matched, subreddit, group_name, engagement_score
       FROM social_leads
       WHERE status = 'discovered'
       ORDER BY engagement_score DESC
       LIMIT $1`,
      [batchSize]
    );

    if (leads.length === 0) return result;

    console.log(`[social-monitor] Processing ${leads.length} discovered leads`);

    // Process in parallel batches of 5 (Groq allows 30 RPM)
    const PARALLEL_BATCH = 5;
    for (let i = 0; i < leads.length; i += PARALLEL_BATCH) {
      const batch = leads.slice(i, i + PARALLEL_BATCH);

      const batchResults = await Promise.allSettled(
        batch.map(async (lead) => {
          const post: SocialPost = {
            platform: lead.platform as SocialPlatform,
            postUrl: lead.post_url,
            postText: lead.post_text || "",
            authorName: lead.author_name || "Unknown",
            authorUsername: lead.author_username || "",
            authorProfileUrl: lead.author_profile_url || "",
            keywordMatched: lead.keyword_matched || "",
            subreddit: lead.subreddit || undefined,
            groupName: lead.group_name || undefined,
            likes: 0,
            comments: 0,
            shares: 0,
          };

          // Generate AI comment + extract intelligence (single call)
          const aiResult = await generateComment(
            post.postText,
            post.platform,
            post.authorName,
            post.subreddit,
            post.groupName
          );

          // Store with AI results (updates existing discovered record)
          await storeSocialLead(post, aiResult);

          // Score the keyword that found this post
          if (lead.keyword_matched) {
            await scoreKeywordAfterDiscovery(
              lead.keyword_matched,
              lead.platform,
              true, // new streamer
              aiResult.category
            );
          }

          // Ingest extracted keywords from bio
          const newKeywords = await ingestDiscoveryKeywords(
            post.postText,
            post.platform,
            lead.keyword_matched || "",
            aiResult.hashtags,
            aiResult.mentions,
            aiResult.niche
          );

          // Send Telegram alerts for hot/warm
          if (aiResult.category === "hot" || aiResult.category === "warm") {
            await sendSocialLeadAlert({
              platform: post.platform,
              postUrl: post.postUrl,
              postText: post.postText,
              authorName: post.authorName,
              authorUsername: post.authorUsername,
              keywordMatched: post.keywordMatched,
              subreddit: post.subreddit,
              groupName: post.groupName,
              aiComment: aiResult.comment,
              category: aiResult.category,
              engagementScore: lead.engagement_score,
            });
          }

          return {
            category: aiResult.category,
            newKeywords: newKeywords.length,
          };
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          result.processed++;
          if (r.value.category === "hot") result.hotAlerts++;
          else if (r.value.category === "warm") result.warmAlerts++;
          result.keywordsGenerated += r.value.newKeywords;
        } else {
          result.errors++;
          console.error("[social-monitor] Process error:", r.reason?.message);
        }
      }

      // Small delay between batches (500ms for 30 RPM Groq limit)
      if (i + PARALLEL_BATCH < leads.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Send digest if we have results
    if (result.processed > 0) {
      await sendSocialDigest(result.hotAlerts, result.warmAlerts, result.processed, []);
    }
  } catch (e: any) {
    console.error("[social-monitor] processDiscoveredLeads failed:", e?.message);
    result.errors++;
  }

  return result;
}

// ═══════════════════════════════════════════════════════
// PHASE 3: EVOLVE — keyword management
// ═══════════════════════════════════════════════════════

export async function runKeywordEvolution(): Promise<{
  promoted: number;
  demoted: number;
  retired: number;
}> {
  return evolveKeywords();
}

// ═══════════════════════════════════════════════════════
// CONVENIENCE: Full monitor (discover + process + evolve)
// ═══════════════════════════════════════════════════════

export async function monitorAllPlatforms(config?: Partial<MonitorConfig>) {
  // Phase 1: Discover
  const discovery = await discoverAllPlatforms(config);

  // Phase 2: Process (max 20 leads)
  const processing = await processDiscoveredLeads(20);

  // Phase 3: Evolve keywords
  const evolution = await runKeywordEvolution();

  return {
    ...discovery,
    processed: processing.processed,
    hotAlerts: processing.hotAlerts,
    warmAlerts: processing.warmAlerts,
    keywordsGenerated: processing.keywordsGenerated,
    evolved: evolution,
    total: processing.processed,
  };
}
