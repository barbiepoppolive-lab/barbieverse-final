// Reddit Monitor — Reddit API for keyword monitoring
// Uses OAuth2 when REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set
// Falls back to public JSON API (may be blocked from server IPs)
// Docs: https://www.reddit.com/dev/api/

import type { SocialPost } from "./types";

const REDDIT_BASE_URL = "https://www.reddit.com";
const USER_AGENT = "Barbieverse/1.0 (Social Media Monitor; by /u/barbieverse_bot)";

let cachedToken: { token: string; expires: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=https://oauth.reddit.com/grants/installed_client&device_id=DO_NOT_TRACK_THIS_DEVICE",
  });

  if (!resp.ok) return null;
  const data = await resp.json() as any;
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

interface RedditPost {
  data: {
    id: string;
    subreddit: string;
    title: string;
    selftext: string;
    author: string;
    author_fullname?: string;
    permalink: string;
    url: string;
    score: number;
    num_comments: number;
    upvote_ratio: number;
    created_utc: number;
    is_self: boolean;
    link_flair_text?: string;
  };
}

interface RedditSearchResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

// ── Search Reddit for keyword ──────────────────────────

export async function searchReddit(
  keyword: string,
  subreddit?: string,
  limit: number = 25,
  timeFilter: "hour" | "day" | "week" = "day"
): Promise<SocialPost[]> {
  const posts: SocialPost[] = [];

  const params = new URLSearchParams({
    q: keyword,
    restrict_sr: subreddit ? "true" : "false",
    sort: "new",
    t: timeFilter,
    limit: String(limit),
  });

  const token = await getRedditToken();
  let url: string;
  let headers: Record<string, string>;

  if (token) {
    // OAuth2 endpoint
    url = `https://oauth.reddit.com/r/${subreddit || "all"}/search?${params}`;
    headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    };
  } else {
    // Public JSON endpoint (may be blocked from server IPs)
    url = `${REDDIT_BASE_URL}/r/${subreddit || "all"}/search.json?${params}`;
    headers = { "User-Agent": USER_AGENT };
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`[reddit] Search failed for "${keyword}": ${response.status}`);
      return [];
    }

    const json: RedditSearchResponse = await response.json();

    for (const child of json.data.children) {
      const post = child.data;

      // Skip low-quality posts
      if (post.score < 0) continue;
      if (post.author === "[deleted]" || post.author === "[removed]") continue;

      // Check if keyword appears in title or body
      const text = `${post.title} ${post.selftext}`.toLowerCase();
      if (!text.includes(keyword.toLowerCase())) continue;

      posts.push({
        platform: "reddit",
        postUrl: `https://reddit.com${post.permalink}`,
        postText: post.selftext || post.title,
        authorName: post.author,
        authorUsername: post.author,
        authorProfileUrl: `https://reddit.com/u/${post.author}`,
        keywordMatched: keyword,
        subreddit: post.subreddit,
        likes: post.score,
        comments: post.num_comments,
        shares: 0,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
      });
    }
  } catch (e: any) {
    console.error(`[reddit] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor multiple subreddits ────────────────────────

export async function monitorReddit(
  keywords: string[],
  subreddits: string[],
  maxResults: number = 25
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenUrls = new Set<string>();

  // Limit to top 5 keywords and top 5 subreddits to stay fast
  const kws = keywords.slice(0, 5);
  const subs = subreddits.slice(0, 5);

  for (const keyword of kws) {
    // Search across all subreddits
    const posts = await searchReddit(keyword, undefined, maxResults, "day");

    for (const post of posts) {
      if (!seenUrls.has(post.postUrl)) {
        seenUrls.add(post.postUrl);
        allPosts.push(post);
      }
    }

    // Also search specific subreddits (limited set)
    for (const sub of subs) {
      const subPosts = await searchReddit(keyword, sub, 10, "day");
      for (const post of subPosts) {
        if (!seenUrls.has(post.postUrl)) {
          seenUrls.add(post.postUrl);
          allPosts.push(post);
        }
      }
    }

    // Rate limit: Reddit allows ~60 requests/min for unauthenticated
    await new Promise((r) => setTimeout(r, 1100));
  }

  // Sort by engagement (score + comments)
  allPosts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));

  return allPosts.slice(0, maxResults * 2);
}
