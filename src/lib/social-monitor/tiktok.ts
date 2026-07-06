// TikTok Monitor — Apify-based TikTok video monitoring for PH market
// Uses clockworks-free~tiktok-scraper (free tier: 1 actor run/min, ~$0.001/run)
// Docs: https://apify.com/clockworks-free/tiktok-scraper

import type { SocialPost } from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";
const TIKTOK_ACTOR = "clockworks-free~tiktok-scraper";

function getApifyToken(): string | null {
  return process.env.APIFY_TOKEN || null;
}

// ── Search TikTok Videos via Apify ─────────────────────

export async function searchTikTok(
  keyword: string,
  maxResults: number = 20,
  sortBy: "RELEVANCE" | "LIKE_COUNT" | "CREATE_TIME" | "VIEW_COUNT" = "RELEVANCE"
): Promise<SocialPost[]> {
  const token = getApifyToken();
  if (!token) {
    console.warn("[tiktok] APIFY_TOKEN not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  try {
    // Start Apify actor run
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${TIKTOK_ACTOR}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerms: [keyword],
          resultsPerPage: Math.min(maxResults, 50),
          searchSortType: sortBy,
          searchVideoType: "ALL",
          shouldDownloadVideos: false,
          shouldDownloadSlideshowImages: false,
          shouldDownloadSubtitles: false,
          shouldDownloadMusic: false,
        }),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text().catch(() => "");
      console.error(`[tiktok] Actor run failed: ${runResponse.status} - ${errText}`);
      return [];
    }

    const items = await runResponse.json();

    if (!Array.isArray(items)) {
      console.error("[tiktok] Unexpected response format:", typeof items);
      return [];
    }

    for (const item of items) {
      const videoUrl = item.video?.playAddr || item.webVideoUrl || "";
      const authorUrl = item.author?.url || "";
      const authorId = item.author?.id || item.authorId || "";
      const authorName = item.author?.nickname || item.author?.name || "Unknown";

      posts.push({
        platform: "tiktok",
        postUrl: videoUrl || `https://tiktok.com/@${authorId}/video/${item.id}`,
        postText: item.desc || item.text || "",
        authorName,
        authorUsername: item.author?.uniqueId || item.author?.username || authorId,
        authorProfileUrl: authorUrl || `https://tiktok.com/@${authorId}`,
        keywordMatched: keyword,
        likes: item.stats?.diggCount || item.likes || 0,
        comments: item.stats?.commentCount || item.comments || 0,
        shares: item.stats?.shareCount || item.shares || 0,
        publishedAt: item.createTimeISO || item.createTime
          ? new Date(item.createTimeISO || item.createTime * 1000).toISOString()
          : undefined,
        raw: item,
      });
    }
  } catch (e: any) {
    console.error(`[tiktok] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor TikTok for keywords ────────────────────────

export async function monitorTikTok(
  keywords: string[],
  maxResults: number = 20,
  sortBy: "RELEVANCE" | "LIKE_COUNT" | "CREATE_TIME" | "VIEW_COUNT" = "RELEVANCE"
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenIds = new Set<string>();

  // Limit to top 2 keywords — Apify free tier is rate-limited
  const kws = keywords.slice(0, 2);

  for (const keyword of kws) {
    const posts = await searchTikTok(keyword, maxResults, sortBy);

    for (const post of posts) {
      // Dedupe by video URL or post text
      const videoId = post.postUrl.split("/video/")[1] || post.postText?.slice(0, 50);
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        allPosts.push(post);
      }
    }

    // Rate limit: Apify free tier ~1 request every few seconds
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Sort by engagement (likes + comments + shares)
  allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

  return allPosts.slice(0, maxResults * kws.length);
}
