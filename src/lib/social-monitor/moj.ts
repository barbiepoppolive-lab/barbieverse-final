// Moj Monitor — Apify-based Moj video monitoring for India market
// Uses mojscraper actor (~$1/15K records)
// Moj is India's leading short-video platform (160M+ MAU, TikTok replacement)
// Docs: https://apify.com/nicholasgriffintn/mojscraper

import type { SocialPost } from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";
const MOJ_ACTOR = "nicholasgriffintn~mojscraper";

function getApifyToken(): string | null {
  return process.env.APIFY_TOKEN || null;
}

// ── Search Moj Videos via Apify ─────────────────────

export async function searchMoj(
  keyword: string,
  maxResults: number = 20
): Promise<SocialPost[]> {
  const token = getApifyToken();
  if (!token) {
    console.warn("[moj] APIFY_TOKEN not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  try {
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${MOJ_ACTOR}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search: keyword,
          maxResults: Math.min(maxResults, 50),
          sort: "relevance",
          type: "videos",
        }),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text().catch(() => "");
      console.error(`[moj] Actor run failed: ${runResponse.status} - ${errText}`);
      return [];
    }

    const items = await runResponse.json();

    if (!Array.isArray(items)) {
      console.error("[moj] Unexpected response format:", typeof items);
      return [];
    }

    for (const item of items) {
      const videoUrl = item.videoUrl || item.url || "";
      const authorUrl = item.authorUrl || item.userUrl || "";
      const authorId = item.authorId || item.userId || item.userHandle || "";
      const authorName = item.authorName || item.userName || item.displayName || "Unknown";
      const authorUsername = item.authorHandle || item.userHandle || item.username || authorId;

      posts.push({
        platform: "moj",
        postUrl: videoUrl || `https://mojapp.in/@${authorId}`,
        postText: item.description || item.caption || item.text || "",
        authorName,
        authorUsername,
        authorProfileUrl: authorUrl || `https://mojapp.in/@${authorUsername}`,
        keywordMatched: keyword,
        likes: item.likes || item.likeCount || item.hearts || 0,
        comments: item.comments || item.commentCount || 0,
        shares: item.shares || item.shareCount || 0,
        publishedAt: item.createdAt || item.uploadedAt
          ? new Date(item.createdAt || item.uploadedAt).toISOString()
          : undefined,
        raw: item,
      });
    }
  } catch (e: any) {
    console.error(`[moj] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor Moj for keywords ────────────────────────

export async function monitorMoj(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenIds = new Set<string>();

  // Limit to top 2 keywords — Apify is rate-limited
  const kws = keywords.slice(0, 2);

  for (const keyword of kws) {
    const posts = await searchMoj(keyword, maxResults);

    for (const post of posts) {
      const videoId = post.postUrl.split("/video/")[1] || post.postText?.slice(0, 50);
      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        allPosts.push(post);
      }
    }

    // Rate limit: wait between Apify requests
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Sort by engagement (likes + comments + shares)
  allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

  return allPosts.slice(0, maxResults * kws.length);
}
