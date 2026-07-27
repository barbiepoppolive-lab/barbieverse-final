export * from "./types";
export * from "./facebook";
export * from "./reddit";
export * from "./twitter";
export * from "./youtube";
export * from "./instagram";
export * from "./tiktok";
export * from "./moj";
export * from "./ai-comment";
export * from "./telegram-alert";
export * from "./keyword-intel";

import { monitorFacebook } from "./facebook";
import { monitorReddit } from "./reddit";
import { monitorTwitter } from "./twitter";
import { monitorYouTube } from "./youtube";
import { monitorInstagram } from "./instagram";
import { monitorTikTok } from "./tiktok";
import { monitorMoj } from "./moj";
import { generateComment } from "./ai-comment";
import { scoreMojLead } from "./moj-score";
import { sendSocialLeadAlert, sendSocialDigest } from "./telegram-alert";
import { DEFAULT_MONITOR_CONFIG, loadMonitorConfig } from "./types";
import type { SocialPost, SocialPlatform, MonitorConfig } from "./types";
import {
  scoreKeywordAfterDiscovery,
  selectKeywordsForPlatform,
  seedKeywordsFromConfig,
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

// ── Telegram alert throttling ──────────────────────────
// Only hot leads clearing ALERT_MIN_ENGAGEMENT get an individual ping, and at
// most ALERT_MAX_PER_RUN of them per run. Everything else rolls into the digest.
const ALERT_MIN_ENGAGEMENT = Number(process.env.ALERT_MIN_ENGAGEMENT) || 10;
const ALERT_MAX_PER_RUN = Number(process.env.ALERT_MAX_PER_RUN) || 5;

// ── Resolve search keywords for a platform ─────────────
// The adaptive keyword_scores pool (selectKeywordsForPlatform) was designed
// to self-improve over time, but it started empty for every platform and
// nothing ever seeded it — so every run silently fell back to the static
// settings list and the "self-improving" part never actually ran. Fix: the
// first time the adaptive pool is empty for a platform, seed it from the
// static list (seedKeywordsFromConfig already existed but was never called
// anywhere) so future runs use real scoring instead of falling back forever.
// If the static list is ALSO empty (nothing configured in /admin/scraper),
// this returns [] — that's a config gap, not something code can fix.

async function resolveKeywords(
  platform: SocialPlatform,
  staticList: string[],
  count: number
): Promise<string[]> {
  let kws = await selectKeywordsForPlatform(platform, count);
  if (kws.length === 0 && staticList.length > 0) {
    await seedKeywordsFromConfig(staticList, platform);
    kws = await selectKeywordsForPlatform(platform, count);
  }
  return kws.length > 0 ? kws : staticList.slice(0, count);
}

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

const AUTHOR_COOLDOWN_DAYS = 14;

async function storeDiscoveredPost(post: SocialPost): Promise<string | null> {
  const { q } = await import("@/lib/db.server");

  const existing = await q<{ id: string }>(
    `SELECT id FROM social_leads WHERE post_url = $1 LIMIT 1`,
    [post.postUrl]
  );

  if (existing.length > 0) return existing[0].id;

  // Cross-post author cooldown: the same person posting three times in a
  // week shouldn't turn into three separate action-queue items telling you
  // to go comment on them again — that's how a well-meaning human comment
  // starts reading as a bot following someone around. Skip if we already
  // have a lead for this author+platform from the last 14 days.
  if (post.authorUsername) {
    const recentSameAuthor = await q<{ id: string }>(
      `SELECT id FROM social_leads
       WHERE platform = $1 AND author_username = $2
         AND discovered_at > now() - interval '${AUTHOR_COOLDOWN_DAYS} days'
       LIMIT 1`,
      [post.platform, post.authorUsername]
    );
    if (recentSameAuthor.length > 0) return null;
  }

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
      moj: parseFloat(db.scraper_interval_moj || "12"),
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
      moj: db.scraper_enabled_moj !== "false",
    };
  } catch {
    return {
      youtube: true, reddit: true, twitter: true,
      tiktok: true, facebook: true, instagram: true, moj: true,
    };
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 1: DISCOVER — fast, no AI, stores ALL posts
// ═══════════════════════════════════════════════════════

export interface DiscoveryResult {
  facebook: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  reddit: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  twitter: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  youtube: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  instagram: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  tiktok: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
  moj: { found: number; stored: number; errors: number; skipped: boolean; noKeywords: boolean };
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
    facebook: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    reddit: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    twitter: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    youtube: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    instagram: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    tiktok: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
    moj: { found: 0, stored: 0, errors: 0, skipped: false, noKeywords: false },
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
    shouldRunPlatform("moj", intervals.moj).then(r => r && platformEnabled.moj),
  ]);

  const [runYT, runReddit, runTwitter, runFB, runIG, runTikTok, runMoj] = platformChecks;

  results.youtube.skipped = !runYT;
  results.reddit.skipped = !runReddit;
  results.twitter.skipped = !runTwitter;
  results.facebook.skipped = !runFB;
  results.instagram.skipped = !runIG;
  results.tiktok.skipped = !runTikTok;
  results.moj.skipped = !runMoj;

  // Run platforms that are due — use weighted keyword selection
  const fbResult = { posts: [] as SocialPost[], error: "" };
  const redditResult = { posts: [] as SocialPost[], error: "" };
  const twitterResult = { posts: [] as SocialPost[], error: "" };
  const ytResult = { posts: [] as SocialPost[], error: "" };
  const igResult = { posts: [] as SocialPost[], error: "" };
  const tiktokResult = { posts: [] as SocialPost[], error: "" };
  const mojResult = { posts: [] as SocialPost[], error: "" };

  const promises: Promise<void>[] = [];

  if (runYT) {
    const kws = await resolveKeywords("youtube", cfg.youtubeQueries, 3);
    results.youtube.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorYouTube(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "YouTube"
      ).then((p) => { ytResult.posts = p; }).catch((e) => { ytResult.error = e?.message || "unknown"; })
    );
  }

  if (runReddit) {
    const kws = await resolveKeywords("reddit", cfg.keywords, 5);
    results.reddit.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorReddit(kws, cfg.redditSubreddits, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Reddit"
      ).then((p) => { redditResult.posts = p; }).catch((e) => { redditResult.error = e?.message || "unknown"; })
    );
  }

  if (runTwitter) {
    const kws = await resolveKeywords("twitter", cfg.twitterQueries, 5);
    results.twitter.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorTwitter(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Twitter"
      ).then((p) => { twitterResult.posts = p; }).catch((e) => { twitterResult.error = e?.message || "unknown"; })
    );
  }

  if (runFB) {
    const kws = await resolveKeywords("facebook", cfg.facebookQueries, 3);
    results.facebook.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorFacebook(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Facebook"
      ).then((p) => { fbResult.posts = p; }).catch((e) => { fbResult.error = e?.message || "unknown"; })
    );
  }

  if (runIG) {
    const kws = await resolveKeywords("instagram", cfg.instagramHashtags, 2);
    results.instagram.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorInstagram(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Instagram"
      ).then((p) => { igResult.posts = p; }).catch((e) => { igResult.error = e?.message || "unknown"; })
    );
  }

  if (runTikTok) {
    const kws = await resolveKeywords("tiktok", cfg.tiktokQueries, 2);
    results.tiktok.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorTikTok(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "TikTok"
      ).then((p) => { tiktokResult.posts = p; }).catch((e) => { tiktokResult.error = e?.message || "unknown"; })
    );
  }

  if (runMoj) {
    const kws = await resolveKeywords("moj", cfg.mojQueries, 2);
    results.moj.noKeywords = kws.length === 0;
    promises.push(
      withTimeout(
        monitorMoj(kws, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Moj"
      ).then((p) => { mojResult.posts = p; }).catch((e) => { mojResult.error = e?.message || "unknown"; })
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
  if (runMoj) await setLastRunAt("moj");

  // Tally results
  const platformResults = [
    { key: "facebook", result: fbResult },
    { key: "reddit", result: redditResult },
    { key: "twitter", result: twitterResult },
    { key: "youtube", result: ytResult },
    { key: "instagram", result: igResult },
    { key: "tiktok", result: tiktokResult },
    { key: "moj", result: mojResult },
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
    ...mojResult.posts,
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
  const noEngagementPlatforms = new Set(["youtube", "instagram", "tiktok", "moj"]);
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

  // Alert throttling — tune via env without a code change.
  let individualAlertsSent = 0;
  const digestCandidates: Array<{
    platform: string;
    postUrl: string;
    category: string;
    engagementScore: number;
  }> = [];

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

    // Seed anti-repetition context with recently generated comments, so the
    // model doesn't converge on the same phrasing across dozens of leads.
    // Updated between batches (not within — these run in parallel) so later
    // batches in this same run also avoid repeating earlier ones.
    const recentCommentsRows = await q<{ ai_generated_comment: string }>(
      `SELECT ai_generated_comment FROM social_leads
       WHERE ai_generated_comment IS NOT NULL AND ai_generated_comment != ''
       ORDER BY updated_at DESC LIMIT 15`
    );
    let recentComments = recentCommentsRows.map((r) => r.ai_generated_comment);

    // Process in parallel batches of 5 (Groq allows 30 RPM)
    const PARALLEL_BATCH = 5;
    for (let i = 0; i < leads.length; i += PARALLEL_BATCH) {
      const batch = leads.slice(i, i + PARALLEL_BATCH);
      const batchRecentComments = recentComments.slice(0, 10);

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
            post.groupName,
            batchRecentComments
          );

          // For Moj posts, use the scoring model to override category
          let finalCategory = aiResult.category;
          let mojScore = null;
          if (post.platform === "moj") {
            const profile = (post.raw as any)?.profile || null;
            mojScore = scoreMojLead(post, profile);
            // Trust Moj scoring model if it's more confident
            if (mojScore.total >= 65 && aiResult.category !== "hot") {
              finalCategory = "hot";
            } else if (mojScore.total >= 40 && aiResult.category === "cold") {
              finalCategory = "warm";
            }
          }

          // Store with AI results (updates existing discovered record)
          await storeSocialLead(post, { ...aiResult, category: finalCategory });

          // Score the keyword that found this post
          if (lead.keyword_matched) {
            await scoreKeywordAfterDiscovery(
              lead.keyword_matched,
              lead.platform,
              true, // new streamer
              finalCategory
            );
          }

          // Ingest extracted keywords from bio — only from leads the AI
          // actually judged relevant. Feeding keyword discovery from every
          // scraped post regardless of category is exactly how the pool got
          // flooded with noise from clearly-irrelevant "cold" content (e.g.
          // recipe videos, tarot readings) — those posts have no business
          // contributing to what we search for next.
          const newKeywords = finalCategory !== "cold"
            ? await ingestDiscoveryKeywords(
                post.postText,
                post.platform,
                lead.keyword_matched || "",
                aiResult.hashtags,
                aiResult.mentions,
                aiResult.niche
              )
            : [];

          // Telegram alerting.
          //
          // Previously every hot AND warm lead fired its own message, which
          // buried the genuinely good leads. Now only hot leads clearing an
          // engagement floor get an individual ping, capped per run; warm
          // leads roll up into the digest instead.
          const alertWorthy =
            finalCategory === "hot" &&
            (lead.engagement_score ?? 0) >= ALERT_MIN_ENGAGEMENT;

          if (alertWorthy || finalCategory === "warm") {
            digestCandidates.push({
              platform: post.platform,
              postUrl: post.postUrl,
              category: finalCategory,
              engagementScore: lead.engagement_score ?? 0,
            });
          }

          if (alertWorthy && individualAlertsSent < ALERT_MAX_PER_RUN) {
            individualAlertsSent++;
            const mojScoreText = mojScore
              ? `\n[Moj Score: ${mojScore.total}/100 P:${mojScore.profile} E:${mojScore.engagement} C:${mojScore.content}]`
              : "";
            await sendSocialLeadAlert({
              platform: post.platform,
              postUrl: post.postUrl,
              postText: (post.postText || "") + mojScoreText,
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
            category: finalCategory,
            newKeywords: newKeywords.length,
            comment: aiResult.comment,
          };
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          result.processed++;
          if (r.value.category === "hot") result.hotAlerts++;
          else if (r.value.category === "warm") result.warmAlerts++;
          result.keywordsGenerated += r.value.newKeywords;
          if (r.value.comment) recentComments = [r.value.comment, ...recentComments].slice(0, 15);
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

    // Send digest only when there was something worth reporting. A digest
    // reading "0 hot, 0 warm" every single run is pure noise.
    //
    // Also actually pass the top leads through — this used to be called with
    // an empty array, so the digest's "Top leads" section never rendered.
    if (result.hotAlerts > 0 || result.warmAlerts > 0) {
      const topPosts = digestCandidates
        .sort((a, b) => {
          if (a.category !== b.category) return a.category === "hot" ? -1 : 1;
          return b.engagementScore - a.engagementScore;
        })
        .slice(0, 5)
        .map(({ platform, postUrl, category }) => ({ platform, postUrl, category }));

      await sendSocialDigest(result.hotAlerts, result.warmAlerts, result.processed, topPosts);
    } else if (result.processed > 0) {
      console.log(
        `[social-monitor] Processed ${result.processed} leads, none hot/warm — digest suppressed`,
      );
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
