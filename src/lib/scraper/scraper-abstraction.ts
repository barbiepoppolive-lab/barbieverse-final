// Multi-Platform Scraper Abstraction Layer
// Supports: Instagram, Facebook, Twitter/X, YouTube, Telegram
// Providers: Phantombuster, Apify, CSV/JSON import

// ── Types ──────────────────────────────────────────────

export type ScraperProvider = "phantombuster" | "apify" | "csv" | "json";

export type Platform = "instagram" | "facebook" | "twitter" | "youtube" | "telegram";

export type ScrapeTarget =
  | "profiles"
  | "posts"
  | "reels"
  | "stories"
  | "comments"
  | "followers"
  | "following"
  | "hashtags"
  | "channels"
  | "videos"
  | "shorts";

export type ScrapeJobStatus = "pending" | "running" | "completed" | "failed";

export interface ScrapeJob {
  id: string;
  provider: ScraperProvider;
  platform: Platform;
  target: ScrapeTarget;
  status: ScrapeJobStatus;
  input: Record<string, any>;
  result_count: number;
  error?: string;
  cost_usd?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ScrapedProfile {
  platform: Platform;
  username: string;
  display_name?: string;
  bio?: string;
  followers?: number;
  following?: number;
  posts_count?: number;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
  profile_pic_url?: string;
  external_url?: string;
  email?: string;
  city?: string;
  category?: string;
  page_likes?: number; // Facebook
  subscribers?: number; // YouTube
  description?: string; // YouTube/Telegram
  raw_data?: Record<string, any>;
}

export interface ScrapedPost {
  platform: Platform;
  id: string;
  short_code?: string;
  text?: string; // unified caption/text field
  likes?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  timestamp?: string;
  media_type?: string;
  media_url?: string;
  author_username?: string;
  hashtags?: string[];
  url?: string;
  raw_data?: Record<string, any>;
}

export interface ScrapedComment {
  platform: Platform;
  id: string;
  text?: string;
  author_username?: string;
  timestamp?: string;
  likes?: number;
  post_id?: string;
  raw_data?: Record<string, any>;
}

// ── Provider Interface ─────────────────────────────────

export interface ScraperProviderInterface {
  name: ScraperProvider;
  isConfigured(): boolean;
  scrapeProfiles(platform: Platform, urls: string[]): Promise<ScrapedProfile[]>;
  scrapePosts?(platform: Platform, urls: string[], limit?: number): Promise<ScrapedPost[]>;
  scrapeComments?(platform: Platform, urls: string[], limit?: number): Promise<ScrapedComment[]>;
  getJobStatus?(jobId: string): Promise<ScrapeJob>;
}

// ── Platform-specific URL patterns ─────────────────────

export const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  instagram: [
    /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?instagram\.com\/stories\/([a-zA-Z0-9_.]+)/,
  ],
  facebook: [
    /^https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9_.]+)/,
    /^https?:\/\/(www\.)?facebook\.com\/pages\/([a-zA-Z0-9_.]+)/,
    /^https?:\/\/(www\.)?fb\.com\/([a-zA-Z0-9_.]+)/,
  ],
  twitter: [
    /^https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/,
    /^https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/(\d+)/,
  ],
  youtube: [
    /^https?:\/\/(www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ],
  telegram: [
    /^https?:\/\/(t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/?/,
  ],
};

export function detectPlatform(url: string): Platform | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) return platform as Platform;
    }
  }
  return null;
}

export function extractUsername(url: string, platform: Platform): string | null {
  const patterns = PLATFORM_PATTERNS[platform];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[2]) return match[2];
  }
  return null;
}

// ── Normalization Helpers ──────────────────────────────

export function normalizeProfile(data: any, provider: ScraperProvider, platform: Platform): ScrapedProfile {
  const base: ScrapedProfile = {
    platform,
    username: "",
  };

  // Phantombuster format (Instagram)
  if (provider === "phantombuster" && platform === "instagram") {
    return {
      ...base,
      username: data.username || data["Profile Url"]?.split("/").pop() || "",
      display_name: data["Full Name"] || data.full_name || "",
      bio: data["Bio"] || data.biography || "",
      followers: parseInt(data["Followers"] || data.follower_count || "0"),
      following: parseInt(data["Following"] || data.following_count || "0"),
      posts_count: parseInt(data["Posts"] || data.media_count || "0"),
      is_private: data["Private"] === "Yes" || data.is_private || false,
      is_verified: data["Verified"] === "Yes" || data.is_verified || false,
      is_business: data["Business"] === "Yes" || data.is_business || false,
      profile_pic_url: data["Image Url"] || data.profile_pic_url || "",
      external_url: data["Website"] || data.external_url || "",
      email: data["Email"] || data.email || "",
      raw_data: data,
    };
  }

  // Apify format — dispatch by platform
  if (provider === "apify") {
    if (platform === "instagram") {
      return {
        ...base,
        username: data.username || "",
        display_name: data.fullName || data.full_name || "",
        bio: data.biography || data.bio || "",
        followers: data.followersCount || data.followers || 0,
        following: data.followsCount || data.following || 0,
        posts_count: data.postsCount || data.media_count || 0,
        is_private: data.isPrivate || false,
        is_verified: data.isVerified || false,
        is_business: data.isBusinessAccount || false,
        profile_pic_url: data.profilePicUrl || "",
        external_url: data.externalUrl || "",
        email: data.email || "",
        city: data.city || "",
        raw_data: data,
      };
    }

    if (platform === "facebook") {
      return {
        ...base,
        username: data.pageId || data.username || "",
        display_name: data.name || data.pageName || "",
        bio: data.about || data.description || "",
        followers: data.followersCount || data.followers || 0,
        page_likes: data.likesCount || data.likes || 0,
        is_verified: data.isVerified || false,
        is_business: true,
        category: data.category || "",
        profile_pic_url: data.profilePicture || data.picture || "",
        external_url: data.website || "",
        raw_data: data,
      };
    }

    if (platform === "twitter") {
      return {
        ...base,
        username: data.username || "",
        display_name: data.name || "",
        bio: data.description || "",
        followers: data.followersCount || 0,
        following: data.friendsCount || 0,
        posts_count: data.statusesCount || 0,
        is_verified: data.isVerified || data.verified || false,
        profile_pic_url: data.profileImageUrl || "",
        raw_data: data,
      };
    }

    if (platform === "youtube") {
      return {
        ...base,
        username: data.channelId || data.channelUrl?.split("/").pop() || "",
        display_name: data.channelName || data.title || "",
        bio: data.description || "",
        subscribers: data.subscriberCount || 0,
        is_verified: data.isVerified || false,
        profile_pic_url: data.channelThumbnail || data.thumbnailUrl || "",
        raw_data: data,
      };
    }

    if (platform === "telegram") {
      return {
        ...base,
        username: data.username || data.channelUsername || "",
        display_name: data.title || data.name || "",
        bio: data.description || "",
        subscribers: data.subscriberCount || data.membersCount || 0,
        description: data.about || "",
        raw_data: data,
      };
    }
  }

  // Generic/CSV format — try common field names
  return {
    ...base,
    username: data.username || data["Username"] || data["Handle"] || "",
    display_name: data.full_name || data["Full Name"] || data["Name"] || data["Display Name"] || "",
    bio: data.bio || data["Bio"] || data["About"] || "",
    followers: parseInt(data.followers || data["Followers"] || data["Followers Count"] || "0"),
    following: parseInt(data.following || data["Following"] || "0"),
    posts_count: parseInt(data.posts || data["Posts"] || data["Posts Count"] || "0"),
    is_private: data.is_private === "true" || data.is_private === true,
    is_verified: data.is_verified === "true" || data.is_verified === true,
    is_business: data.is_business === "true" || data.is_business === true,
    profile_pic_url: data.profile_pic_url || data["Profile Picture"] || data["Avatar"] || "",
    external_url: data.external_url || data["Website"] || "",
    email: data.email || data["Email"] || "",
    city: data.city || data["City"] || "",
    page_likes: parseInt(data.page_likes || data["Page Likes"] || "0"),
    subscribers: parseInt(data.subscribers || data["Subscribers"] || "0"),
    raw_data: data,
  };
}

export function normalizePost(data: any, provider: ScraperProvider, platform: Platform): ScrapedPost {
  const base: ScrapedPost = { platform, id: "" };

  if (provider === "apify") {
    if (platform === "instagram") {
      return {
        ...base,
        id: data.id || "",
        short_code: data.shortCode || "",
        text: data.caption || "",
        likes: data.likesCount || 0,
        comments_count: data.commentsCount || 0,
        shares_count: data.sharesCount || 0,
        views_count: data.videoViewCount || data.playCount || 0,
        timestamp: data.timestamp || "",
        media_type: data.type || "image",
        media_url: data.url || "",
        author_username: data.ownerUsername || "",
        hashtags: data.hashtags || [],
        url: data.url || "",
        raw_data: data,
      };
    }

    if (platform === "facebook") {
      return {
        ...base,
        id: data.postId || data.id || "",
        text: data.message || data.text || "",
        likes: data.reactionsCount || data.likes || 0,
        comments_count: data.commentsCount || 0,
        shares_count: data.sharesCount || 0,
        views_count: data.videoViews || 0,
        timestamp: data.timestamp || data.time || "",
        media_type: data.type || "status",
        media_url: data.link || "",
        author_username: data.pageName || "",
        url: data.permalinkUrl || data.link || "",
        raw_data: data,
      };
    }

    if (platform === "twitter") {
      return {
        ...base,
        id: data.id || data.tweetId || "",
        text: data.full_text || data.text || "",
        likes: data.favoriteCount || data.likes || 0,
        comments_count: data.replyCount || 0,
        shares_count: data.retweetCount || 0,
        views_count: data.viewCount || 0,
        timestamp: data.createdAt || data.timestamp || "",
        author_username: data.author?.userName || data.username || "",
        url: data.url || "",
        raw_data: data,
      };
    }

    if (platform === "youtube") {
      return {
        ...base,
        id: data.videoId || data.id || "",
        text: data.title || "",
        views_count: data.viewCount || 0,
        likes: data.likeCount || 0,
        comments_count: data.commentCount || 0,
        timestamp: data.publishedAt || data.uploadDate || "",
        media_url: data.videoUrl || data.url || "",
        author_username: data.channelName || "",
        raw_data: data,
      };
    }

    if (platform === "telegram") {
      return {
        ...base,
        id: data.messageId || data.id || "",
        text: data.text || data.message || "",
        views_count: data.views || 0,
        timestamp: data.date || data.timestamp || "",
        author_username: data.author || "",
        media_url: data.mediaUrl || "",
        raw_data: data,
      };
    }
  }

  // Generic format
  return {
    ...base,
    id: data.id || data["ID"] || data["Post ID"] || "",
    short_code: data.short_code || data["Short Code"] || "",
    text: data.text || data.caption || data["Caption"] || data["Text"] || "",
    likes: parseInt(data.likes || data["Likes"] || "0"),
    comments_count: parseInt(data.comments || data["Comments"] || "0"),
    shares_count: parseInt(data.shares || data["Shares"] || "0"),
    views_count: parseInt(data.views || data["Views"] || "0"),
    timestamp: data.timestamp || data["Date"] || data["Time"] || "",
    media_type: data.media_type || data["Type"] || "text",
    media_url: data.media_url || data["URL"] || "",
    author_username: data.author_username || data["Username"] || "",
    hashtags: data.hashtags || [],
    url: data.url || data["Link"] || "",
    raw_data: data,
  };
}

export function normalizeComment(data: any, provider: ScraperProvider, platform: Platform): ScrapedComment {
  const base: ScrapedComment = { platform, id: "" };

  return {
    ...base,
    id: data.id || data["Comment ID"] || "",
    text: data.text || data["Text"] || data["Comment"] || "",
    author_username: data.author_username || data.username || data["Username"] || "",
    timestamp: data.timestamp || data["Date"] || "",
    likes: parseInt(data.likes || data["Likes"] || "0"),
    post_id: data.post_id || data["Post ID"] || "",
    raw_data: data,
  };
}
