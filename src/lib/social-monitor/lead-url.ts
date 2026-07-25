// Lead URL resolution
//
// ── The bug this fixes ──────────────────────────────────────────────────
// Clicking "Open" on a scraped lead downloaded a video file instead of
// opening the post. That made the whole comment workflow impossible: you
// can't leave a comment on an .mp4 sitting in your Downloads folder.
//
// Cause: two scrapers stored the raw CDN media URL as the post URL.
//
//   Moj    (old parser)  postUrl: videoUrl || `${MOJ_BASE}/@${handle}`
//   TikTok               postUrl: videoUrl || `https://tiktok.com/@...`
//
// `videoUrl` is a direct link to the video file on the CDN, e.g.
//   https://cdn-moj-g.sharechat.com/…/contents/moj_3862292621/…/abc.mp4
// Browsers download those rather than rendering a page, which is exactly
// what you'd expect them to do — the data was wrong, not the browser.
//
// ── Why reconstruct rather than just fall back to the profile ───────────
// Those CDN paths embed the content ID (`moj_3862292621`), so the real
// post page can be rebuilt exactly: mojapp.in/@handle/video/3862292621.
// That lands you on the specific video with its comment box, which is the
// whole point. Falling back to the profile page would technically "work"
// but would make you hunt for the right video every time.
//
// This runs at render time so existing rows are fixed without waiting for
// a migration, and the source scrapers are fixed so new rows are correct.

export interface LeadUrlInput {
  platform?: string | null;
  post_url?: string | null;
  author_username?: string | null;
  author_profile_url?: string | null;
}

/** Direct media/file links — these download rather than open a page. */
const DIRECT_MEDIA_RE = /\.(mp4|m3u8|mov|webm|jpg|jpeg|png|webp|gif)(\?|$)/i;

/** Known CDN hosts that never serve a viewable post page. */
const CDN_HOST_RE = /(cdn-moj|cdn\d*\.sharechat|cdn-im\.sharechat|tiktokcdn|muscdn|akamaized|cloudfront|fbcdn)/i;

export function isDirectMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return DIRECT_MEDIA_RE.test(url) || CDN_HOST_RE.test(url);
}

/** Pull a Moj content id out of any URL containing `moj_<digits>`. */
function extractMojVideoId(url: string): string | null {
  return url.match(/moj_(\d+)/)?.[1] || null;
}

/** Pull a TikTok video id — CDN paths commonly carry a long numeric id. */
function extractTikTokVideoId(url: string): string | null {
  return url.match(/\/video\/(\d{6,})/)?.[1] || url.match(/(\d{15,})/)?.[1] || null;
}

/**
 * Best viewable URL for a lead — the page you can actually comment on.
 *
 * Order of preference:
 *   1. The stored post_url, if it's already a real page
 *   2. A page URL reconstructed from the CDN media link
 *   3. The author's profile page
 *   4. The original value (better than a dead link)
 */
export function resolveLeadUrl(lead: LeadUrlInput): string {
  const stored = (lead.post_url || "").trim();
  const handle = (lead.author_username || "").replace(/^@/, "").trim();
  const profile = (lead.author_profile_url || "").trim();
  const platform = (lead.platform || "").toLowerCase();

  if (stored && !isDirectMediaUrl(stored)) return stored;

  // ── Rebuild a real post page from the media URL where possible
  if (stored) {
    if (platform === "moj" || /sharechat|moj/i.test(stored)) {
      const videoId = extractMojVideoId(stored);
      if (videoId && handle) return `https://mojapp.in/@${handle}/video/${videoId}`;
      if (videoId) return `https://mojapp.in/video/${videoId}`;
    }

    if (platform === "tiktok" || /tiktok|muscdn/i.test(stored)) {
      const videoId = extractTikTokVideoId(stored);
      if (videoId && handle) return `https://www.tiktok.com/@${handle}/video/${videoId}`;
    }
  }

  // ── Fall back to the profile — still actionable, just less precise
  if (profile && !isDirectMediaUrl(profile)) return profile;
  if (handle) {
    if (platform === "moj") return `https://mojapp.in/@${handle}`;
    if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
    if (platform === "instagram") return `https://instagram.com/${handle}`;
    if (platform === "youtube") return `https://www.youtube.com/@${handle}`;
    if (platform === "twitter") return `https://x.com/${handle}`;
  }

  return stored || profile || "";
}

/**
 * True when the stored URL was broken and we had to rebuild or fall back.
 * The admin UI uses this to flag the row, so a scraper regression shows up
 * as a visible warning instead of silently degrading again.
 */
export function wasUrlRepaired(lead: LeadUrlInput): boolean {
  return isDirectMediaUrl(lead.post_url) && resolveLeadUrl(lead) !== (lead.post_url || "");
}

/** Did we land on a profile rather than the exact post? */
export function isProfileFallback(lead: LeadUrlInput): boolean {
  const resolved = resolveLeadUrl(lead);
  return !!resolved && !/\/video\/|\/p\/|\/reel\/|\/status\/|\/watch/.test(resolved);
}
