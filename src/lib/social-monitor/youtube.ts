// YouTube Monitor — YouTube Data API v3 for keyword monitoring
// Free tier: 10,000 units/day (search.list costs 100 units per call)
// Docs: https://developers.google.com/youtube/v3/docs/search/list

import type { SocialPost } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

// ── Search YouTube Videos ──────────────────────────────

export async function searchYouTube(
  keyword: string,
  maxResults: number = 20
): Promise<SocialPost[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  const params = new URLSearchParams({
    key: apiKey,
    q: keyword,
    part: "snippet",
    type: "video",
    order: "date",
    maxResults: String(Math.min(maxResults, 50)),
    publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?${params}`
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[youtube] Search failed for "${keyword}": ${response.status} - ${err}`);
      return [];
    }

    const json = await response.json();

    if (!json.items) return [];

    for (const item of json.items) {
      const snippet = item.snippet;
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      posts.push({
        platform: "youtube",
        postUrl: `https://youtube.com/watch?v=${videoId}`,
        postText: `${snippet.title}\n\n${snippet.description || ""}`,
        authorName: snippet.channelTitle || "Unknown",
        authorUsername: snippet.channelId || "",
        authorProfileUrl: `https://youtube.com/channel/${snippet.channelId}`,
        keywordMatched: keyword,
        likes: 0,
        comments: 0,
        shares: 0,
        publishedAt: snippet.publishedAt,
      });
    }
  } catch (e: any) {
    console.error(`[youtube] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor YouTube for keywords ───────────────────────

export async function monitorYouTube(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenIds = new Set<string>();

  // Limit to top 5 keywords to stay fast
  const kws = keywords.slice(0, 5);

  for (const keyword of kws) {
    const posts = await searchYouTube(keyword, maxResults);

    for (const post of posts) {
      const videoId = post.postUrl.split("v=")[1];
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        allPosts.push(post);
      }
    }

    // Rate limit: YouTube quota is 10,000 units/day, search costs 100 units
    // Be conservative: 2 second delay between searches
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Sort by recency (newest first — engagement not available from search API)
  allPosts.sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  return allPosts.slice(0, maxResults * keywords.length);
}
