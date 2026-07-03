// Social Media Monitor — Type definitions

export type SocialPlatform = "facebook" | "reddit" | "twitter" | "youtube";

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
  /** Maximum results per platform per run */
  maxResultsPerPlatform: number;
  /** Minimum engagement score to consider (likes + comments + shares) */
  minEngagement: number;
}

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  keywords: [
    "poppo live",
    "vone live",
    "poppo host",
    "vone host",
    "live streaming earn money",
    "go live earn",
    "poppo agency",
    "vone agency",
    "live streaming india earn",
  ],
  redditSubreddits: [
    "WorkOnline",
    "beermoney",
    "beermoneyindia",
    "IndianGaming",
    "OnlineMoneyHustles",
    "SideHustle",
    "freelance",
    "WorkFromHome",
  ],
  facebookQueries: [
    "poppo live",
    "vone live",
    "live streaming earn money",
    "poppo host earn",
  ],
  twitterQueries: [
    "poppo live",
    "vone live",
    "poppo host",
    "live streaming earn india",
  ],
  youtubeQueries: [
    "poppo live earn money",
    "vone live india",
    "live streaming earn money india",
  ],
  maxResultsPerPlatform: 20,
  minEngagement: 2,
};
