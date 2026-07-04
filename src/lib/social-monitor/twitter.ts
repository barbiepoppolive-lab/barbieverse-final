// Twitter/X Monitor — Free tier API for keyword monitoring
// Uses Twitter API v2 free tier (1,500 reads/month)
// Docs: https://developer.twitter.com/en/docs/twitter-api

import type { SocialPost } from "./types";

const TWITTER_API_BASE = "https://api.twitter.com/2";

function getBearerToken(): string | null {
  return process.env.TWITTER_BEARER_TOKEN || null;
}

// ── Types ──────────────────────────────────────────────

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    reply_count: number;
    retweet_count: number;
    quote_count: number;
  };
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
}

interface TweetSearchResponse {
  data?: Tweet[];
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

// ── Search Recent Tweets ───────────────────────────────

export async function searchTwitter(
  keyword: string,
  maxResults: number = 20
): Promise<SocialPost[]> {
  const bearerToken = getBearerToken();
  if (!bearerToken) {
    console.warn("[twitter] TWITTER_BEARER_TOKEN not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  // Build query: keyword + exclude retweets + English
  const query = `${keyword} -is:retweet lang:en`;

  const params = new URLSearchParams({
    query,
    "max_results": String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,public_metrics,author_id,referenced_tweets",
    "expansions": "author_id",
    "user.fields": "name,username,public_metrics",
  });

  try {
    const response = await fetch(
      `${TWITTER_API_BASE}/tweets/search/recent?${params}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[twitter] Search failed for "${keyword}": ${response.status} - ${err}`);
      return [];
    }

    const json: TweetSearchResponse = await response.json();

    if (!json.data) return [];

    // Build author lookup
    const authorMap = new Map<string, any>();
    if (json.includes?.users) {
      for (const user of json.includes.users) {
        authorMap.set(user.id, user);
      }
    }

    for (const tweet of json.data) {
      const author = authorMap.get(tweet.author_id);

      posts.push({
        platform: "twitter",
        postUrl: `https://twitter.com/${author?.username || "i"}/status/${tweet.id}`,
        postText: tweet.text,
        authorName: author?.name || "Unknown",
        authorUsername: author?.username || "",
        authorProfileUrl: `https://twitter.com/${author?.username || ""}`,
        keywordMatched: keyword,
        likes: tweet.public_metrics.like_count,
        comments: tweet.public_metrics.reply_count,
        shares: tweet.public_metrics.retweet_count + tweet.public_metrics.quote_count,
        publishedAt: tweet.created_at,
      });
    }
  } catch (e: any) {
    console.error(`[twitter] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor Twitter for keywords ───────────────────────

export async function monitorTwitter(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenIds = new Set<string>();

  // Limit to top 5 keywords to stay fast
  const kws = keywords.slice(0, 5);

  for (const keyword of kws) {
    const posts = await searchTwitter(keyword, maxResults);

    for (const post of posts) {
      const tweetId = post.postUrl.split("/status/")[1];
      if (tweetId && !seenIds.has(tweetId)) {
        seenIds.add(tweetId);
        allPosts.push(post);
      }
    }

    // Rate limit: Twitter free tier = 450 requests/15min for search
    // Be conservative: 1 request per keyword
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Sort by engagement
  allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

  return allPosts.slice(0, maxResults * keywords.length);
}
