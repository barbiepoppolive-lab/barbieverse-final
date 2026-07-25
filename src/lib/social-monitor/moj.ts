// Moj Monitor — creator discovery for Barbieverse agency recruitment
//
// ── Why this was rewritten ──────────────────────────────────────────────
// The previous version scraped mojapp.in's homepage and keyword-filtered the
// results. That cannot work, and it's worth being precise about why, because
// the failure was structural rather than a tuning problem:
//
//   * The homepage feed is a generic aggregated feed — cricket, film clips,
//     entertainment. It is not personalized and not keyword-addressable.
//     Filtering it for "poppo / live / paise kamao" matches ~nothing, forever.
//   * Moj web exposes no search endpoint.
//   * Tag pages (/tag/<slug>) resolve to "#undefined" — they need internal
//     numeric tag IDs, not slugs, so hashtag discovery isn't available either.
//
// What DOES work is the video permalink page: /@{handle}/video/{videoId} is
// server-rendered and ships both the target video AND a related-video feed.
// That related feed is topically similar to the video you're on. So instead
// of filtering a random feed, we crawl: start from a video that IS about
// live streaming / earning money, harvest its related feed, and walk outward.
// Relevance comes from where you start, not from filtering afterward.
//
// This makes SEED QUALITY the single most important input. Seeds live in
// settings.scraper_moj_seeds (one Moj video URL or @handle per line). Give it
// three or four real videos about live streaming or earning from home and the
// crawl stays in that neighbourhood. Give it nothing and it falls back to the
// homepage, which is the old broken behaviour and will find little.

import type { SocialPost } from "./types";

const MOJ_BASE = "https://mojapp.in";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html",
};

const REQUEST_DELAY_MS = 1200;
const DEFAULT_MAX_PAGES = 25;

// ── Target segments ──────────────────────────────────────
// Three distinct kinds of person, needing three distinct pitches. Lumping
// them into one "is this relevant y/n" score is what made the old comments
// generic. A Moj Live host and a student posting "ghar baithe kamao" content
// need completely different opening lines.

export type MojSegment = "live_host" | "short_video_creator" | "earning_content";

export interface MojCandidate extends SocialPost {
  segment: MojSegment;
  /** 0-100, how good a recruitment target this looks like */
  fitScore: number;
  /** Human-readable justification, surfaced in the Telegram queue */
  fitReason: string;
  handle: string;
  videoId?: string;
}

// Signals per segment. Deliberately includes Hinglish/Devanagari, because
// that's what this audience actually writes in — an English-only keyword set
// silently misses most of the market.
const LIVE_HOST_SIGNALS = [
  "live", "लाइव", "live aao", "live pe", "livestream", "live stream",
  "gifting", "gift", "pk battle", "pk ", "battle", "host", "hosting",
  "poppo", "vone", "bigo", "chamet", "tango", "likee live", "mojlive",
  "moj live", "agency", "id de", "id chahiye", "beans", "diamond",
];

const EARNING_SIGNALS = [
  "paise kamao", "paisa kamao", "पैसे कमाओ", "kamai", "kamana", "earn money",
  "earning", "income", "ghar baithe", "घर बैठे", "work from home",
  "part time", "side income", "student earning", "online job",
  "online earning", "daily payment", "withdraw", "payout",
];

// Content that superficially matches "earning" language but is actually
// affiliate/scam spam — these are not creators, they're funnels, and they
// waste outreach volume. Down-rank hard.
const SPAM_SIGNALS = [
  "trading", "forex", "binary", "crypto", "betting", "satta", "colour prediction",
  "color prediction", "aviator", "teen patti", "casino", "loan", "refer and earn",
  "investment plan", "double your", "guaranteed profit",
];

function containsAny(text: string, signals: string[]): string | null {
  const lower = text.toLowerCase();
  for (const s of signals) {
    if (lower.includes(s)) return s;
  }
  return null;
}

function countMatches(text: string, signals: string[]): number {
  const lower = text.toLowerCase();
  return signals.filter((s) => lower.includes(s)).length;
}

/**
 * Score a creator as a recruitment target. Combines topical signal with
 * audience-size sanity: a 4M-follower star will not join a new agency, and a
 * 12-follower account isn't worth an outreach slot either. The realistic
 * sweet spot for agency recruitment is the mid-tail.
 */
export function classifyCandidate(input: {
  caption: string;
  bio?: string;
  followers?: number;
  totalLikes?: number;
  postCount?: number;
  keywords?: string[];
}): { segment: MojSegment; fitScore: number; fitReason: string } {
  const text = `${input.caption || ""} ${input.bio || ""}`;
  const reasons: string[] = [];

  const liveHits = countMatches(text, LIVE_HOST_SIGNALS);
  const earnHits = countMatches(text, EARNING_SIGNALS);
  const spamHits = countMatches(text, SPAM_SIGNALS);
  const customHit = input.keywords?.length ? containsAny(text, input.keywords.map((k) => k.toLowerCase())) : null;

  let segment: MojSegment;
  let score = 0;

  if (liveHits > 0) {
    segment = "live_host";
    // Highest-value segment: already live streaming, already monetized by
    // gifting. Switching/adding Poppo is an incremental ask, not a new habit.
    score = 55 + Math.min(liveHits * 10, 25);
    reasons.push(`already streams/mentions live (${liveHits} signal${liveHits > 1 ? "s" : ""})`);
  } else if (earnHits > 0) {
    segment = "earning_content";
    score = 40 + Math.min(earnHits * 8, 20);
    reasons.push(`money-motivated content (${earnHits} signal${earnHits > 1 ? "s" : ""})`);
  } else {
    segment = "short_video_creator";
    score = 25;
    reasons.push("general short-video creator");
  }

  if (customHit) {
    score += 8;
    reasons.push(`matched your keyword "${customHit}"`);
  }

  // Audience-size band
  const audience = input.followers ?? input.totalLikes ?? 0;
  if (audience > 0) {
    if (audience >= 1_000 && audience <= 200_000) {
      score += 15;
      reasons.push("audience in the recruitable mid-tail");
    } else if (audience > 200_000 && audience <= 1_000_000) {
      score -= 5;
      reasons.push("large audience — likely already has agency offers");
    } else if (audience > 1_000_000) {
      score -= 30;
      reasons.push("mega-creator, very unlikely to sign with a new agency");
    } else if (audience >= 300) {
      score -= 8;
      reasons.push("small audience");
    } else {
      // A 40-follower account that happens to say "live" once is not a
      // recruit. This penalty has to be large enough to outweigh the
      // live_host base score, or near-empty accounts outrank real mid-tail
      // creators purely on keyword hits.
      score -= 35;
      reasons.push("almost no audience — likely inactive or brand-new");
    }
  }

  // Active poster = actually still using the platform
  if ((input.postCount ?? 0) >= 10) {
    score += 5;
    reasons.push("posts regularly");
  }

  if (spamHits > 0) {
    score -= 40;
    reasons.push(`⚠ looks like affiliate/betting spam (${spamHits} signal${spamHits > 1 ? "s" : ""})`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { segment, fitScore: score, fitReason: reasons.join("; ") };
}

// ── HTML parsing ─────────────────────────────────────────
// Two independent parse strategies. Moj's markup is not a documented API and
// will change without notice, so a single brittle selector is a guaranteed
// future silent-zero. Strategy A uses their test id; Strategy B anchors on
// the CDN content id, which is far more stable because it's part of the
// media URL rather than a presentational attribute. Whichever yields more is
// used, and which one won is reported so a broken selector is visible in the
// Telegram summary instead of just quietly returning nothing.

export interface ParsedVideo {
  videoId: string;
  handle: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
}

function parseEngagement(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/,/g, "").trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  if (/K$/i.test(clean)) return Math.round(num * 1_000);
  if (/M$/i.test(clean)) return Math.round(num * 1_000_000);
  if (/B$/i.test(clean)) return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseByTestId(html: string): ParsedVideo[] {
  const out: ParsedVideo[] = [];
  const blocks = html.split('data-testid="video-item"');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const handle = b.match(/\/@([A-Za-z0-9._]+)/)?.[1] || "";
    if (!handle) continue;
    out.push({
      videoId: b.match(/moj_(\d+)/)?.[1] || "",
      handle,
      caption: decodeHtmlEntities(b.match(/alt="([^"]*)"/)?.[1] || ""),
      likes: parseEngagement(b.match(/like-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
      comments: parseEngagement(b.match(/comment-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
      shares: parseEngagement(b.match(/share-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
    });
  }
  return out;
}

function parseByContentId(html: string): ParsedVideo[] {
  const out: ParsedVideo[] = [];
  const seen = new Set<string>();

  // Each card carries exactly one moj_<id> in its media URL. Use those as
  // anchors and read a window around each for the rest of the card's fields.
  const idRe = /moj_(\d+)/g;
  const matches = [...html.matchAll(idRe)];

  for (let i = 0; i < matches.length; i++) {
    const videoId = matches[i][1];
    if (seen.has(videoId)) continue;
    seen.add(videoId);

    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? html.length) : html.length;
    // Look a little before the anchor too — the thumbnail (with the caption
    // in its alt) is usually rendered just above the video source.
    const windowStart = Math.max(0, start - 2000);
    const block = html.slice(windowStart, Math.min(end + 1500, html.length));

    const handle = block.match(/mojapp\.in\/@([A-Za-z0-9._]+)/)?.[1]
      || block.match(/\/@([A-Za-z0-9._]+)/)?.[1]
      || "";
    if (!handle) continue;

    const caption = decodeHtmlEntities(
      block.match(/alt="([^"]{4,})"/)?.[1] || ""
    );

    out.push({
      videoId,
      handle,
      caption,
      likes: parseEngagement(block.match(/like-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
      comments: parseEngagement(block.match(/comment-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
      shares: parseEngagement(block.match(/share-button[\s\S]{0,200}?>([\d,.]+[KMB]?)</i)?.[1] || "0"),
    });
  }

  return out;
}

export function parseMojPage(html: string): { videos: ParsedVideo[]; parser: "testid" | "contentid" | "none" } {
  const byTestId = parseByTestId(html);
  const byContentId = parseByContentId(html);

  if (byTestId.length >= byContentId.length && byTestId.length > 0) {
    return { videos: byTestId, parser: "testid" };
  }
  if (byContentId.length > 0) {
    return { videos: byContentId, parser: "contentid" };
  }
  return { videos: [], parser: "none" };
}

// ── Fetching ─────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { headers: FETCH_HEADERS });
    if (!resp.ok) {
      console.warn(`[moj] ${resp.status} for ${url}`);
      return null;
    }
    return await resp.text();
  } catch (e: any) {
    console.warn(`[moj] fetch error for ${url}:`, e?.message);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Profile enrichment ───────────────────────────────────

export interface MojProfile {
  handle: string;
  name: string;
  bio: string;
  followers: number;
  totalLikes: number;
  postCount: number;
  verified: boolean;
  badge: string | null;
  profilePicUrl: string;
}

/**
 * Profile data lives in an embedded JSON blob on the profile page. The blob's
 * key has changed before (it's an internal implementation detail, not an
 * API), so this tries the known key first and then falls back to scanning for
 * any embedded payload that looks like a profile object.
 */
export async function scrapeMojProfile(handle: string): Promise<MojProfile | null> {
  const html = await fetchHtml(`${MOJ_BASE}/@${handle}`);
  if (!html) return null;

  const shape = (p: any): MojProfile => ({
    handle: p.h || handle,
    name: p.n || handle,
    bio: p.s || p.status || "",
    followers: p.fc ?? p.followerCount ?? 0,
    totalLikes: p.likeCount ?? p.lc ?? 0,
    postCount: p.pc ?? p.postCount ?? 0,
    verified: !!(p.badgeUrl || p.verified),
    badge: p.creatorBadgeDetails?.badges?.[0]?.badgeText || null,
    profilePicUrl: p.pu || p.profilePic || "",
  });

  // Primary: the known embedded request payload
  try {
    const apiMatch = html.match(/requestType\d+"[^>]*>([^<]+)/);
    if (apiMatch) {
      const apiData = JSON.parse(decodeHtmlEntities(apiMatch[1]));
      const body = typeof apiData.body === "string" ? JSON.parse(apiData.body) : apiData.body;
      const p = body?.payload?.d;
      if (p) return shape(p);
    }
  } catch {
    /* fall through to secondary strategy */
  }

  // Secondary: any embedded JSON object carrying the profile-ish shape.
  // Matches on the handle field so we don't grab an unrelated blob.
  try {
    const loose = html.match(/\{"[^{}]*"h":"[^"]+"[\s\S]{0,4000}?\}/);
    if (loose) {
      const p = JSON.parse(loose[0]);
      if (p.h) return shape(p);
    }
  } catch {
    /* give up — caller treats null as "not enriched" rather than "not a lead" */
  }

  console.warn(`[moj] profile blob not parseable for @${handle} — Moj markup may have changed`);
  return null;
}

// ── Seed resolution ──────────────────────────────────────

function seedToUrl(seed: string): string | null {
  const s = seed.trim();
  if (!s) return null;
  if (s.startsWith("http")) return s;
  if (s.startsWith("@")) return `${MOJ_BASE}/${s}`;
  // Bare numeric id → treat as a video id under a placeholder handle; Moj
  // resolves the canonical URL on redirect.
  if (/^\d+$/.test(s)) return `${MOJ_BASE}/@moj/video/${s}`;
  return null;
}

// ── The crawl ────────────────────────────────────────────

export interface MojCrawlResult {
  candidates: MojCandidate[];
  pagesFetched: number;
  videosSeen: number;
  parserUsed: string;
  /** Set when seeds were absent and we fell back to the (weak) homepage */
  usedHomepageFallback: boolean;
  warnings: string[];
}

/**
 * Breadth-first crawl of Moj video permalinks, expanding through each page's
 * related-video feed.
 *
 * @param seeds  Moj video URLs or @handles to start from. Quality here
 *               determines everything — see the file header.
 */
export async function crawlMoj(opts: {
  seeds: string[];
  keywords?: string[];
  maxPages?: number;
  maxCandidates?: number;
  minFitScore?: number;
}): Promise<MojCrawlResult> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const maxCandidates = opts.maxCandidates ?? 40;
  const minFitScore = opts.minFitScore ?? 35;
  const warnings: string[] = [];

  const frontier: string[] = [];
  let usedHomepageFallback = false;

  for (const seed of opts.seeds) {
    const url = seedToUrl(seed);
    if (url) frontier.push(url);
  }

  if (frontier.length === 0) {
    usedHomepageFallback = true;
    warnings.push(
      "No Moj seeds configured (settings.scraper_moj_seeds). Fell back to the homepage feed, " +
      "which is generic entertainment content and will find very few relevant creators. " +
      "Add 3-4 Moj video URLs about live streaming or earning from home to fix this."
    );
    frontier.push(MOJ_BASE);
  }

  const visitedUrls = new Set<string>();
  const seenVideoIds = new Set<string>();
  const seenHandles = new Set<string>();
  const parserCounts: Record<string, number> = {};

  // Stage 1 — crawl pages, collect distinct handles with their best video
  const handleHits = new Map<string, ParsedVideo>();
  let pagesFetched = 0;
  let videosSeen = 0;

  while (frontier.length > 0 && pagesFetched < maxPages) {
    const url = frontier.shift()!;
    if (visitedUrls.has(url)) continue;
    visitedUrls.add(url);

    const html = await fetchHtml(url);
    pagesFetched++;
    if (!html) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    const { videos, parser } = parseMojPage(html);
    parserCounts[parser] = (parserCounts[parser] || 0) + 1;
    videosSeen += videos.length;

    for (const v of videos) {
      if (v.videoId && seenVideoIds.has(v.videoId)) continue;
      if (v.videoId) seenVideoIds.add(v.videoId);

      // Keep the highest-engagement video per handle as their representative
      const existing = handleHits.get(v.handle);
      const score = v.likes + v.comments + v.shares;
      if (!existing || score > existing.likes + existing.comments + existing.shares) {
        handleHits.set(v.handle, v);
      }

      // Expand: every video permalink is a new page whose related feed is
      // topically adjacent. This is the mechanism that keeps the crawl inside
      // a relevant neighbourhood instead of drifting back to generic content.
      if (v.videoId && frontier.length < maxPages * 3) {
        const next = `${MOJ_BASE}/@${v.handle}/video/${v.videoId}`;
        if (!visitedUrls.has(next)) frontier.push(next);
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  if (videosSeen === 0) {
    warnings.push(
      "Crawled pages but parsed zero videos — Moj's page markup has probably changed. " +
      "Both parse strategies returned nothing."
    );
  }

  // Stage 2 — enrich the most promising handles with profile data (bio is
  // where both the real relevance signal and the contact info live). Prefilter
  // on caption alone first so we don't spend a profile fetch on every handle.
  const prefiltered = [...handleHits.entries()]
    .map(([handle, v]) => {
      const pre = classifyCandidate({ caption: v.caption, keywords: opts.keywords });
      return { handle, video: v, pre };
    })
    // Keep anything with a topical signal, plus general creators as filler so
    // a thin crawl still returns something actionable.
    .sort((a, b) => b.pre.fitScore - a.pre.fitScore)
    .slice(0, maxCandidates * 2);

  const candidates: MojCandidate[] = [];

  for (const { handle, video } of prefiltered) {
    if (candidates.length >= maxCandidates) break;
    if (seenHandles.has(handle)) continue;
    seenHandles.add(handle);

    const profile = await scrapeMojProfile(handle);
    await sleep(REQUEST_DELAY_MS);

    const { segment, fitScore, fitReason } = classifyCandidate({
      caption: video.caption,
      bio: profile?.bio,
      followers: profile?.followers,
      totalLikes: profile?.totalLikes,
      postCount: profile?.postCount,
      keywords: opts.keywords,
    });

    if (fitScore < minFitScore) continue;

    candidates.push({
      platform: "moj",
      postUrl: video.videoId
        ? `${MOJ_BASE}/@${handle}/video/${video.videoId}`
        : `${MOJ_BASE}/@${handle}`,
      postText: video.caption,
      authorName: profile?.name || handle,
      authorUsername: handle,
      authorProfileUrl: `${MOJ_BASE}/@${handle}`,
      keywordMatched: segment,
      likes: video.likes,
      comments: video.comments,
      shares: video.shares,
      raw: { profile, videoId: video.videoId },
      segment,
      fitScore,
      fitReason,
      handle,
      videoId: video.videoId,
    });
  }

  candidates.sort((a, b) => b.fitScore - a.fitScore);

  return {
    candidates,
    pagesFetched,
    videosSeen,
    parserUsed: Object.entries(parserCounts).map(([k, v]) => `${k}:${v}`).join(", ") || "none",
    usedHomepageFallback,
    warnings,
  };
}

// ── Backwards-compatible entry point ─────────────────────
// The existing multi-platform monitor calls monitorMoj(keywords, max).
// Keep that signature working, reading seeds from settings.

export async function monitorMoj(
  keywords: string[],
  maxResults: number = 20
): Promise<SocialPost[]> {
  let seeds: string[] = [];
  try {
    const { q } = await import("../db.server");
    const rows = await q<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'scraper_moj_seeds'`
    );
    seeds = (rows[0]?.value || "").split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    seeds = [];
  }

  // Handles configured in the normal keyword box still work as seeds
  seeds.push(...keywords.filter((k) => k.startsWith("@")));

  const result = await crawlMoj({
    seeds,
    keywords: keywords.filter((k) => !k.startsWith("@")),
    maxCandidates: maxResults,
  });

  for (const w of result.warnings) console.warn(`[moj] ${w}`);
  return result.candidates;
}
