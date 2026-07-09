// Moj Monitor — SSR-based scraper for India market
// Moj is India's leading short-video platform (160M+ MAU, TikTok replacement)
// Uses mojapp.in server-side rendering — no API key needed, $0 cost
// Fetches trending videos from homepage + profile metadata for ranking

import type { SocialPost } from "./types";

const MOJ_BASE = "https://mojapp.in";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html",
};

function parseEngagement(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/,/g, "").trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  if (clean.endsWith("K")) return Math.round(num * 1000);
  if (clean.endsWith("M")) return Math.round(num * 1000000);
  if (clean.endsWith("B")) return Math.round(num * 1000000000);
  return Math.round(num);
}

// ── Parse video blocks from Moj HTML ─────────────────

function parseVideoBlocks(html: string, keyword: string): SocialPost[] {
  const posts: SocialPost[] = [];
  const blocks = html.split('data-testid="video-item"');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const handle = block.match(/\/@([a-zA-Z0-9_]+)/)?.[1] || "";
    const desc = block.match(/class="break-words[^"]*"[^>]*>([^<]+)/)?.[1]?.trim() || "";
    const likes = parseEngagement(block.match(/like-button[\s\S]*?<div[^>]*>([\d,.]+[KMB]?)</)?.[1] || "0");
    const comments = parseEngagement(block.match(/comment-button[\s\S]*?<div[^>]*>([\d,.]+[KMB]?)</)?.[1] || "0");
    const shares = parseEngagement(block.match(/share-button[\s\S]*?<div[^>]*>([\d,.]+[KMB]?)</)?.[1] || "0");
    const videoUrl = block.match(/src="(https:\/\/cdn-moj[^"]+\.mp4[^"]*)"/)?.[1] || "";
    const audioId = block.match(/data-testid="audio-item"[^>]*data-value="(\d+)"/)?.[1] || "";

    if (!handle) continue;

    posts.push({
      platform: "moj",
      postUrl: videoUrl || `${MOJ_BASE}/@${handle}`,
      postText: desc,
      authorName: handle,
      authorUsername: handle,
      authorProfileUrl: `${MOJ_BASE}/@${handle}`,
      keywordMatched: keyword,
      likes,
      comments,
      shares,
      raw: { audioId, videoUrl },
    });
  }

  return posts;
}

// ── Scrape Moj homepage for trending videos ──────────

export async function scrapeMojHomepage(): Promise<SocialPost[]> {
  try {
    const resp = await fetch(MOJ_BASE, { headers: FETCH_HEADERS });
    if (!resp.ok) {
      console.error(`[moj] Homepage fetch failed: ${resp.status}`);
      return [];
    }
    const html = await resp.text();
    return parseVideoBlocks(html, "trending");
  } catch (e: any) {
    console.error(`[moj] Homepage error:`, e?.message);
    return [];
  }
}

// ── Scrape a Moj profile page ────────────────────────

export interface MojProfile {
  handle: string;
  name: string;
  bio: string;
  totalLikes: number;
  postCount: number;
  verified: boolean;
  badge: string | null;
  profilePicUrl: string;
}

export async function scrapeMojProfile(handle: string): Promise<MojProfile | null> {
  try {
    const resp = await fetch(`${MOJ_BASE}/@${handle}`, { headers: FETCH_HEADERS });
    if (!resp.ok) return null;
    const html = await resp.text();

    const apiMatch = html.match(/requestType56"[^>]*>([^<]+)/);
    if (!apiMatch) return null;

    const apiData = JSON.parse(apiMatch[1]);
    const p = JSON.parse(apiData.body).payload.d;

    return {
      handle: p.h || handle,
      name: p.n || handle,
      bio: p.s || "",
      totalLikes: p.likeCount || 0,
      postCount: p.pc || 0,
      verified: !!p.badgeUrl,
      badge: p.creatorBadgeDetails?.badges?.[0]?.badgeText || null,
      profilePicUrl: p.pu || "",
    };
  } catch (e: any) {
    console.error(`[moj] Profile scrape failed for @${handle}:`, e?.message);
    return null;
  }
}

// ── Monitor Moj — scrape trending + profiles ─────────

export async function monitorMoj(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  const allPosts: SocialPost[] = [];
  const seenHandles = new Set<string>();

  // 1. Scrape homepage for trending videos
  const trending = await scrapeMojHomepage();
  allPosts.push(...trending);

  // 2. Extract unique handles and scrape their profiles
  for (const post of trending) {
    const handle = post.authorUsername;
    if (handle && !seenHandles.has(handle)) {
      seenHandles.add(handle);

      const profile = await scrapeMojProfile(handle);
      if (profile) {
        // Enrich post with profile data
        post.authorName = profile.name;
        post.raw = {
          ...post.raw,
          profile,
        };
      }

      // Rate limit between profile fetches
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 3. If admin provided specific handles, scrape those too
  const adminHandles = keywords
    .filter((k) => k.startsWith("@") || /^[a-zA-Z0-9_]{3,}$/.test(k))
    .map((k) => k.replace(/^@/, ""));

  for (const handle of adminHandles.slice(0, 5)) {
    if (seenHandles.has(handle)) continue;
    seenHandles.add(handle);

    const profile = await scrapeMojProfile(handle);
    if (profile) {
      allPosts.push({
        platform: "moj",
        postUrl: `${MOJ_BASE}/@${handle}`,
        postText: profile.bio,
        authorName: profile.name,
        authorUsername: handle,
        authorProfileUrl: `${MOJ_BASE}/@${handle}`,
        keywordMatched: keywords.join(","),
        likes: profile.totalLikes,
        comments: 0,
        shares: 0,
        raw: { profile },
      });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  // Sort by engagement
  allPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

  return allPosts.slice(0, maxResults);
}
