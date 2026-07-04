// Facebook Monitor — Apify-based public Facebook post monitoring
// Uses the existing Apify integration to search public Facebook posts

import type { SocialPost } from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";

function getApifyToken(): string | null {
  return process.env.APIFY_TOKEN || null;
}

// ── Search Facebook Posts via Apify ────────────────────

export async function searchFacebookPosts(
  keyword: string,
  maxResults: number = 20
): Promise<SocialPost[]> {
  const token = getApifyToken();
  if (!token) {
    console.warn("[facebook] APIFY_TOKEN not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  try {
    // Use the Facebook Posts Search actor
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/scraper_one~facebook-posts-search/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: keyword,
          resultsCount: maxResults,
          sort: "NEWEST",
        }),
      }
    );

    if (!runResponse.ok) {
      console.error(`[facebook] Actor start failed: ${runResponse.status}`);
      return [];
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      console.error("[facebook] No run ID returned");
      return [];
    }

    // Poll for completion (max 24 seconds — 8 attempts × 3s)
    let status = "RUNNING";
    let attempts = 0;
    while (status === "RUNNING" && attempts < 8) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusResponse = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data?.status || "RUNNING";
      attempts++;
    }

    if (status !== "SUCCEEDED") {
      console.error(`[facebook] Run ended with status: ${status}`);
      return [];
    }

    // Fetch dataset items
    const datasetResponse = await fetch(
      `${APIFY_BASE_URL}/datasets/${runData.data?.defaultDatasetId}/items?token=${token}&format=json`
    );

    if (!datasetResponse.ok) {
      console.error(`[facebook] Dataset fetch failed: ${datasetResponse.status}`);
      return [];
    }

    const items = await datasetResponse.json();

    for (const item of items) {
      posts.push({
        platform: "facebook",
        postUrl: item.url || item.postUrl || item.link || "",
        postText: item.text || item.postText || item.content || item.message || "",
        authorName: item.authorName || item.author || item.pageName || "Unknown",
        authorUsername: item.authorId || item.author || "",
        authorProfileUrl: item.authorUrl || item.authorProfileUrl || "",
        keywordMatched: keyword,
        groupName: item.groupName || item.group || "",
        likes: item.likes || item.reactionsCount || 0,
        comments: item.comments || item.commentsCount || 0,
        shares: item.shares || item.sharesCount || 0,
        publishedAt: item.time || item.createdAt || item.postedAt || "",
        raw: item,
      });
    }
  } catch (e: any) {
    console.error(`[facebook] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor Facebook for keywords ──────────────────────

export async function monitorFacebook(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenUrls = new Set<string>();

  // Limit to top 3 keywords — Apify is slow
  const kws = keywords.slice(0, 3);

  for (const keyword of kws) {
    const posts = await searchFacebookPosts(keyword, maxResults);

    for (const post of posts) {
      const key = post.postUrl || `${post.postText?.slice(0, 50)}`;
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        allPosts.push(post);
      }
    }

    // Rate limit: Apify free tier = 1 request every few seconds
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Sort by engagement
  allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

  return allPosts.slice(0, maxResults * keywords.length);
}
