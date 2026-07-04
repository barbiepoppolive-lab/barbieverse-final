export * from "./types";
export * from "./facebook";
export * from "./reddit";
export * from "./twitter";
export * from "./youtube";
export * from "./ai-comment";
export * from "./telegram-alert";

import { monitorFacebook } from "./facebook";
import { monitorReddit } from "./reddit";
import { monitorTwitter } from "./twitter";
import { monitorYouTube } from "./youtube";
import { generateComment } from "./ai-comment";
import { sendSocialLeadAlert, sendSocialDigest } from "./telegram-alert";
import { DEFAULT_MONITOR_CONFIG, loadMonitorConfig } from "./types";
import type { SocialPost, MonitorConfig } from "./types";

// ── Timeout helper ──────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const PLATFORM_TIMEOUT = 20_000; // 20s per platform

// ── Database operations ────────────────────────────────

async function storeSocialLead(post: SocialPost, aiResult: {
  comment: string;
  confidence: number;
  category: "hot" | "warm" | "cold";
  reasoning: string;
}) {
  const { q } = await import("@/lib/db.server");

  // Check for duplicate by post URL
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

  const results = {
    facebook: { found: 0, stored: 0, errors: 0 },
    reddit: { found: 0, stored: 0, errors: 0 },
    twitter: { found: 0, stored: 0, errors: 0 },
    youtube: { found: 0, stored: 0, errors: 0 },
    total: 0,
    hotAlerts: 0,
    warmAlerts: 0,
  };

  // Run all platforms in parallel with per-platform timeouts
  const fbResult = { posts: [] as SocialPost[], error: "" };
  const redditResult = { posts: [] as SocialPost[], error: "" };
  const twitterResult = { posts: [] as SocialPost[], error: "" };
  const ytResult = { posts: [] as SocialPost[], error: "" };

  await Promise.allSettled([
    withTimeout(
      monitorFacebook(cfg.facebookQueries, cfg.maxResultsPerPlatform),
      PLATFORM_TIMEOUT,
      "Facebook"
    ).then((p) => { fbResult.posts = p; }).catch((e) => { fbResult.error = e?.message || "unknown"; }),
    withTimeout(
      monitorReddit(cfg.keywords, cfg.redditSubreddits, cfg.maxResultsPerPlatform),
      PLATFORM_TIMEOUT,
      "Reddit"
    ).then((p) => { redditResult.posts = p; }).catch((e) => { redditResult.error = e?.message || "unknown"; }),
    withTimeout(
      monitorTwitter(cfg.twitterQueries, cfg.maxResultsPerPlatform),
      PLATFORM_TIMEOUT,
      "Twitter"
    ).then((p) => { twitterResult.posts = p; }).catch((e) => { twitterResult.error = e?.message || "unknown"; }),
    withTimeout(
      monitorYouTube(cfg.youtubeQueries, cfg.maxResultsPerPlatform),
      PLATFORM_TIMEOUT,
      "YouTube"
    ).then((p) => { ytResult.posts = p; }).catch((e) => { ytResult.error = e?.message || "unknown"; }),
  ]);

  const fb = fbResult.posts;
  const reddit = redditResult.posts;
  const twitter = twitterResult.posts;
  const youtube = ytResult.posts;

  results.facebook.found = fb.length;
  results.facebook.errors = fbResult.error ? 1 : 0;
  results.reddit.found = reddit.length;
  results.reddit.errors = redditResult.error ? 1 : 0;
  results.twitter.found = twitter.length;
  results.twitter.errors = twitterResult.error ? 1 : 0;
  results.youtube.found = youtube.length;
  results.youtube.errors = ytResult.error ? 1 : 0;

  if (fbResult.error) console.error("[social-monitor] Facebook error:", fbResult.error);
  if (redditResult.error) console.error("[social-monitor] Reddit error:", redditResult.error);
  if (twitterResult.error) console.error("[social-monitor] Twitter error:", twitterResult.error);
  if (ytResult.error) console.error("[social-monitor] YouTube error:", ytResult.error);

  const allPosts: SocialPost[] = [...fb, ...reddit, ...twitter, ...youtube];

  allPosts.push(...fb, ...reddit, ...twitter, ...youtube);

  // Filter by minimum engagement
  const filteredPosts = allPosts.filter(
    (p) => (p.likes + p.comments + p.shares) >= cfg.minEngagement
  );

  // Generate AI comments and store leads (max 15 per run to stay fast)
  for (const post of filteredPosts.slice(0, 15)) {
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
        // Send Telegram alert for hot/warm leads
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

        // Track per-platform
        if (post.platform === "facebook") results.facebook.stored++;
        if (post.platform === "reddit") results.reddit.stored++;
        if (post.platform === "twitter") results.twitter.stored++;
        if (post.platform === "youtube") results.youtube.stored++;
      }
    } catch (e: any) {
      console.error(`[social-monitor] Error processing ${post.postUrl}:`, e?.message);
    }

    // Rate limit AI calls
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
