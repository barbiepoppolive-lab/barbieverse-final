// Instagram Monitor — Apify-based Instagram hashtag monitoring
// Uses apify/instagram-scraper actor for hashtag search
// Docs: https://apify.com/apify/instagram-scraper

import type { SocialPost } from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";

function getApifyToken(): string | null {
  return process.env.APIFY_TOKEN || null;
}

// ── Search Instagram Posts by Hashtag via Apify ────────

export async function searchInstagramPosts(
  keyword: string,
  maxResults: number = 20,
  newerThan: string = "3 days"
): Promise<SocialPost[]> {
  const token = getApifyToken();
  if (!token) {
    console.warn("[instagram] APIFY_TOKEN not configured, skipping");
    return [];
  }

  const posts: SocialPost[] = [];

  try {
    // Convert keyword to hashtag (remove # if present)
    const hashtag = keyword.replace(/^#/, "").trim();

    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/apify~instagram-scraper/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hashtags: [hashtag],
          resultsLimit: maxResults,
          resultsType: "posts",
          onlyPostsNewerThan: newerThan,
        }),
      }
    );

    if (!runResponse.ok) {
      console.error(`[instagram] Actor start failed: ${runResponse.status}`);
      return [];
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      console.error("[instagram] No run ID returned");
      return [];
    }

    // Poll for completion (max 18 seconds — 6 attempts × 3s)
    let status = "RUNNING";
    let attempts = 0;
    while (status === "RUNNING" && attempts < 6) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusResponse = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data?.status || "RUNNING";
      attempts++;
    }

    if (status !== "SUCCEEDED") {
      console.error(`[instagram] Run ended with status: ${status}`);
      return [];
    }

    // Fetch dataset items
    const datasetResponse = await fetch(
      `${APIFY_BASE_URL}/datasets/${runData.data?.defaultDatasetId}/items?token=${token}&format=json`
    );

    if (!datasetResponse.ok) {
      console.error(`[instagram] Dataset fetch failed: ${datasetResponse.status}`);
      return [];
    }

    const items = await datasetResponse.json();

    for (const item of items) {
      const caption = item.caption || item.text || "";
      const likes = item.likesCount || item.likes || 0;
      const comments = item.commentsCount || item.comments || 0;

      posts.push({
        platform: "instagram",
        postUrl: item.url || item.postUrl || item.link || "",
        postText: caption,
        authorName: item.ownerProfilePicUrl ? (item.ownerUsername || "Unknown") : (item.authorName || item.ownerFullName || "Unknown"),
        authorUsername: item.ownerUsername || item.author || "",
        authorProfileUrl: item.ownerProfileUrl || `https://instagram.com/${item.ownerUsername || ""}`,
        keywordMatched: keyword,
        likes: likes,
        comments: comments,
        shares: 0,
        publishedAt: item.timestamp || item.takenAt || item.createdAt || "",
        raw: item,
      });
    }
  } catch (e: any) {
    console.error(`[instagram] Error searching "${keyword}":`, e?.message);
  }

  return posts;
}

// ── Monitor Instagram for hashtags ─────────────────────

export async function monitorInstagram(
  hashtags: string[],
  maxResults: number = 20,
  newerThan: string = "3 days"
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenUrls = new Set<string>();

  // Limit to top 2 hashtags — Apify is slow and costs credits
  const tags = hashtags.slice(0, 2);

  for (const tag of tags) {
    const posts = await searchInstagramPosts(tag, maxResults, newerThan);

    for (const post of posts) {
      const key = post.postUrl || `${post.postText?.slice(0, 50)}`;
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        allPosts.push(post);
      }
    }

    // Rate limit: Apify free tier — be conservative
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Sort by engagement
  allPosts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));

  return allPosts.slice(0, maxResults * tags.length);
}
