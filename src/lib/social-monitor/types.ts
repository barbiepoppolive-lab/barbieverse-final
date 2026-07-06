// Social Media Monitor — Type definitions

export type SocialPlatform = "facebook" | "reddit" | "twitter" | "youtube" | "instagram" | "tiktok";

export type PostCategory = "hot" | "warm" | "cold";

export type PostStatus =
  | "discovered"
  | "ai_reviewed"
  | "commented"
  | "skipped"
  | "expired";

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
  maxResultsPerPlatform: 20,
  minEngagement: 2,
  platformIntervals: {
    youtube: 0.5,
    twitter: 0.5,
    reddit: 0.5,
    facebook: 72,
    instagram: 72,
    tiktok: 0.5,
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
      maxResultsPerPlatform: parseInt(db.scraper_max_results || "") || DEFAULT_MONITOR_CONFIG.maxResultsPerPlatform,
      minEngagement: parseInt(db.scraper_min_engagement || "") || DEFAULT_MONITOR_CONFIG.minEngagement,
      platformIntervals: DEFAULT_MONITOR_CONFIG.platformIntervals,
    };
  } catch {
    return DEFAULT_MONITOR_CONFIG;
  }
}
