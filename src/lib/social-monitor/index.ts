export * from "./types";
export * from "./facebook";
export * from "./reddit";
export * from "./twitter";
export * from "./youtube";
export * from "./instagram";
export * from "./tiktok";
export * from "./ai-comment";
export * from "./telegram-alert";

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

// ── Database operations ────────────────────────────────

async function storeSocialLead(post: SocialPost, aiResult: {
  comment: string;
  confidence: number;
  category: "hot" | "warm" | "cold";
  reasoning: string;
}) {
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
      engagement_score, ai_generated_comment, ai_confidence, ai_category,
      status, discovered_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
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
      aiResult.comment ? "ai_reviewed" : "discovered",
    ]
  );

  return result[0]?.id;
}

// ── Main monitoring function ───────────────────────────

export async function monitorAllPlatforms(config?: Partial<MonitorConfig>) {
  const dbConfig = await loadMonitorConfig();
  const cfg = { ...dbConfig, ...config };
  const intervals = cfg.platformIntervals;

  const results = {
    facebook: { found: 0, stored: 0, errors: 0, skipped: false },
    reddit: { found: 0, stored: 0, errors: 0, skipped: false },
    twitter: { found: 0, stored: 0, errors: 0, skipped: false },
    youtube: { found: 0, stored: 0, errors: 0, skipped: false },
    instagram: { found: 0, stored: 0, errors: 0, skipped: false },
    tiktok: { found: 0, stored: 0, errors: 0, skipped: false },
    total: 0,
    hotAlerts: 0,
    warmAlerts: 0,
  };

  // Check which platforms should run based on their intervals
  const platformChecks = await Promise.all([
    shouldRunPlatform("youtube", intervals.youtube),
    shouldRunPlatform("twitter", intervals.twitter),
    shouldRunPlatform("reddit", intervals.reddit),
    shouldRunPlatform("facebook", intervals.facebook),
    shouldRunPlatform("instagram", intervals.instagram),
    shouldRunPlatform("tiktok", intervals.tiktok),
  ]);

  const [runYT, runTwitter, runReddit, runFB, runIG, runTikTok] = platformChecks;

  results.youtube.skipped = !runYT;
  results.twitter.skipped = !runTwitter;
  results.reddit.skipped = !runReddit;
  results.facebook.skipped = !runFB;
  results.instagram.skipped = !runIG;
  results.tiktok.skipped = !runTikTok;

  // Run platforms that are due
  const fbResult = { posts: [] as SocialPost[], error: "" };
  const redditResult = { posts: [] as SocialPost[], error: "" };
  const twitterResult = { posts: [] as SocialPost[], error: "" };
  const ytResult = { posts: [] as SocialPost[], error: "" };
  const igResult = { posts: [] as SocialPost[], error: "" };
  const tiktokResult = { posts: [] as SocialPost[], error: "" };

  const promises: Promise<void>[] = [];

  if (runYT) {
    promises.push(
      withTimeout(
        monitorYouTube(cfg.youtubeQueries, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "YouTube"
      ).then((p) => { ytResult.posts = p; }).catch((e) => { ytResult.error = e?.message || "unknown"; })
    );
  }

  if (runTwitter) {
    promises.push(
      withTimeout(
        monitorTwitter(cfg.twitterQueries, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Twitter"
      ).then((p) => { twitterResult.posts = p; }).catch((e) => { twitterResult.error = e?.message || "unknown"; })
    );
  }

  if (runReddit) {
    promises.push(
      withTimeout(
        monitorReddit(cfg.keywords, cfg.redditSubreddits, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Reddit"
      ).then((p) => { redditResult.posts = p; }).catch((e) => { redditResult.error = e?.message || "unknown"; })
    );
  }

  if (runFB) {
    promises.push(
      withTimeout(
        monitorFacebook(cfg.facebookQueries, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Facebook"
      ).then((p) => { fbResult.posts = p; }).catch((e) => { fbResult.error = e?.message || "unknown"; })
    );
  }

  if (runIG) {
    promises.push(
      withTimeout(
        monitorInstagram(cfg.instagramHashtags, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "Instagram"
      ).then((p) => { igResult.posts = p; }).catch((e) => { igResult.error = e?.message || "unknown"; })
    );
  }

  if (runTikTok) {
    promises.push(
      withTimeout(
        monitorTikTok(cfg.tiktokQueries, cfg.maxResultsPerPlatform),
        PLATFORM_TIMEOUT,
        "TikTok"
      ).then((p) => { tiktokResult.posts = p; }).catch((e) => { tiktokResult.error = e?.message || "unknown"; })
    );
  }

  await Promise.allSettled(promises);

  // Update last_run_at for platforms that ran
  if (runYT) await setLastRunAt("youtube");
  if (runTwitter) await setLastRunAt("twitter");
  if (runReddit) await setLastRunAt("reddit");
  if (runFB) await setLastRunAt("facebook");
  if (runIG) await setLastRunAt("instagram");
  if (runTikTok) await setLastRunAt("tiktok");

  const fb = fbResult.posts;
  const reddit = redditResult.posts;
  const twitter = twitterResult.posts;
  const youtube = ytResult.posts;
  const instagram = igResult.posts;
  const tiktok = tiktokResult.posts;

  results.facebook.found = fb.length;
  results.facebook.errors = fbResult.error ? 1 : 0;
  results.reddit.found = reddit.length;
  results.reddit.errors = redditResult.error ? 1 : 0;
  results.twitter.found = twitter.length;
  results.twitter.errors = twitterResult.error ? 1 : 0;
  results.youtube.found = youtube.length;
  results.youtube.errors = ytResult.error ? 1 : 0;
  results.instagram.found = instagram.length;
  results.instagram.errors = igResult.error ? 1 : 0;
  results.tiktok.found = tiktok.length;
  results.tiktok.errors = tiktokResult.error ? 1 : 0;

  if (fbResult.error) console.error("[social-monitor] Facebook error:", fbResult.error);
  if (redditResult.error) console.error("[social-monitor] Reddit error:", redditResult.error);
  if (twitterResult.error) console.error("[social-monitor] Twitter error:", twitterResult.error);
  if (ytResult.error) console.error("[social-monitor] YouTube error:", ytResult.error);
  if (igResult.error) console.error("[social-monitor] Instagram error:", igResult.error);
  if (tiktokResult.error) console.error("[social-monitor] TikTok error:", tiktokResult.error);

  const allPosts: SocialPost[] = [...fb, ...reddit, ...twitter, ...youtube, ...instagram, ...tiktok];

  // Filter by minimum engagement
  const noEngagementPlatforms = new Set(["youtube", "instagram", "tiktok"]);
  const filteredPosts = allPosts.filter(
    (p) => noEngagementPlatforms.has(p.platform) || (p.likes + p.comments + p.shares) >= cfg.minEngagement
  );

  // Generate AI comments and store leads (max 5 per run)
  for (const post of filteredPosts.slice(0, 5)) {
    try {
      const aiResult = await generateComment(
        post.postText,
        post.platform,
        post.authorName,
        post.subreddit,
        post.groupName
      );

      const leadId = await storeSocialLead(post, aiResult);

      if (leadId) {
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
            engagementScore: post.likes + post.comments + post.shares,
          });

          if (aiResult.category === "hot") results.hotAlerts++;
          else results.warmAlerts++;
        }

        results.total++;

        if (post.platform === "facebook") results.facebook.stored++;
        if (post.platform === "reddit") results.reddit.stored++;
        if (post.platform === "twitter") results.twitter.stored++;
        if (post.platform === "youtube") results.youtube.stored++;
        if (post.platform === "instagram") results.instagram.stored++;
        if (post.platform === "tiktok") results.tiktok.stored++;
      }
    } catch (e: any) {
      console.error(`[social-monitor] Error processing ${post.postUrl}:`, e?.message);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  // Send digest if we have results
  if (results.total > 0) {
    const topPosts = filteredPosts
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 5)
      .map((p) => ({
        platform: p.platform,
        postUrl: p.postUrl,
        category: "warm",
      }));

    await sendSocialDigest(results.hotAlerts, results.warmAlerts, results.total, topPosts);
  }

  return results;
}
