// Social Media Monitor — Type definitions

// Platforms we actively POLL. Every Record<SocialPlatform, …> in this
// codebase (intervals, enabled flags, per-platform counters) is keyed off
// this, so it must stay limited to things that are actually scraped on a
// schedule.
export type SocialPlatform = "facebook" | "reddit" | "twitter" | "youtube" | "instagram" | "tiktok" | "moj";

// Telegram host-group leads arrive by PUSH via the bot webhook — there's
// nothing to poll and no interval to configure — so telegram is deliberately
// not a SocialPlatform. This wider type is for anything that reads stored
// leads (admin UI, reporting) where telegram rows do show up.
export type LeadSourcePlatform = SocialPlatform | "telegram";

export type PostCategory = "hot" | "warm" | "cold";

export type PostStatus =
  | "discovered"
  | "ai_reviewed"
  | "commented"
  | "skipped"
  | "expired"
  /** Moj creator with no contact published in their bio — worked by hand
   *  inside the Moj app from the Telegram comment queue. */
  | "queued_manual";

export interface SocialPost {
  platform: SocialPlatform;
  postUrl: string;
  postText: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  keywordMatched: string;
  /** Reddit-specific */
  subreddit?: string;
  /** Facebook-specific */
  groupName?: string;
  /** Engagement metrics */
  likes: number;
  comments: number;
  shares: number;
  /** When the post was published */
  publishedAt?: string;
  /** Raw data from the API */
  raw?: Record<string, any>;
}

export interface SocialLead {
  id: string;
  platform: SocialPlatform;
  post_url: string;
  post_text: string | null;
  author_name: string | null;
  author_username: string | null;
  author_profile_url: string | null;
  keyword_matched: string | null;
  subreddit: string | null;
  group_name: string | null;
  engagement_score: number | null;
  ai_generated_comment: string | null;
  ai_confidence: number | null;
  ai_category: PostCategory | null;
  status: PostStatus;
  notified_at: string | null;
  commented_at: string | null;
  discovered_at: string;
  created_at: string;
}

export interface MonitorConfig {
  /** Keywords to search for across all platforms */
  keywords: string[];
  /** Reddit subreddits to monitor */
  redditSubreddits: string[];
  /** Facebook search queries (public posts only) */
  facebookQueries: string[];
  /** Twitter search queries */
  twitterQueries: string[];
  /** YouTube search queries */
  youtubeQueries: string[];
  /** Instagram hashtag queries */
  instagramHashtags: string[];
  /** TikTok search queries */
  tiktokQueries: string[];
  /** Moj search queries (India) */
  mojQueries: string[];
  /** Maximum results per platform per run */
  maxResultsPerPlatform: number;
  /** Minimum engagement score to consider (likes + comments + shares) */
  minEngagement: number;
  /** Minimum hours between runs per platform (free tier optimization) */
  platformIntervals: Record<SocialPlatform, number>;
}

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  keywords: [],
  redditSubreddits: [],
  facebookQueries: [],
  twitterQueries: [],
  youtubeQueries: [],
  instagramHashtags: [],
  tiktokQueries: [],
  mojQueries: [],
  maxResultsPerPlatform: 20,
  // A post with 0-2 likes/comments isn't necessarily low-quality — someone
  // sincerely posting "need money, looking for work" or "unemployed, any
  // job" almost never goes viral. Those are often the *best* leads (genuine
  // need, no competing agencies already in their comments), so filtering
  // them out by engagement was quietly discarding the highest-intent posts.
  // The AI categorizer (hot/warm/cold) is a better quality gate than raw
  // engagement. Override via scraper_min_engagement in /admin/scraper if
  // spam volume becomes a problem.
  minEngagement: 0,
  platformIntervals: {
    youtube: 0.5,
    twitter: 0.5,
    reddit: 0.5,
    facebook: 72,
    instagram: 72,
    tiktok: 0.5,
    moj: 72,
  },
};

// ── Load config from database (with fallback to defaults) ──

export async function loadMonitorConfig(): Promise<MonitorConfig> {
  try {
    const { q } = await import("../db.server");
    const rows = await q(
      `SELECT key, value FROM settings WHERE key LIKE 'scraper_%'`,
      []
    );

    const db: Record<string, string> = {};
    for (const row of rows) {
      db[row.key] = row.value || "";
    }

    const parseList = (val: string, fallback: string[]): string[] => {
      if (!val) return fallback;
      return val.split("\n").map(s => s.trim()).filter(Boolean);
    };

    return {
      keywords: parseList(db.scraper_keywords, DEFAULT_MONITOR_CONFIG.keywords),
      redditSubreddits: parseList(db.scraper_reddit_subreddits, DEFAULT_MONITOR_CONFIG.redditSubreddits),
      facebookQueries: parseList(db.scraper_facebook_queries, DEFAULT_MONITOR_CONFIG.facebookQueries),
      twitterQueries: parseList(db.scraper_twitter_queries, DEFAULT_MONITOR_CONFIG.twitterQueries),
      youtubeQueries: parseList(db.scraper_youtube_queries, DEFAULT_MONITOR_CONFIG.youtubeQueries),
      instagramHashtags: parseList(db.scraper_instagram_hashtags, DEFAULT_MONITOR_CONFIG.instagramHashtags),
      tiktokQueries: parseList(db.scraper_tiktok_queries, DEFAULT_MONITOR_CONFIG.tiktokQueries),
      mojQueries: parseList(db.scraper_moj_queries, DEFAULT_MONITOR_CONFIG.mojQueries),
      maxResultsPerPlatform: parseInt(db.scraper_max_results || "") || DEFAULT_MONITOR_CONFIG.maxResultsPerPlatform,
      minEngagement: parseInt(db.scraper_min_engagement || "") || DEFAULT_MONITOR_CONFIG.minEngagement,
      platformIntervals: DEFAULT_MONITOR_CONFIG.platformIntervals,
    };
  } catch {
    return DEFAULT_MONITOR_CONFIG;
  }
}
