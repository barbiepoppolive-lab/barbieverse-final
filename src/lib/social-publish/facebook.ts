// Facebook Page Publishing — official Graph API, posts to YOUR OWN Page
// This is legitimate, ToS-compliant automation: posting your own content to
// your own Page via the sanctioned API. Not to be confused with anything
// that engages with other people's content — that's a different, much
// riskier category (see src/lib/social-monitor for why that stays manual).
//
// Setup:
// 1. You need a Facebook PAGE (not a personal profile) — Pages are what
//    the API can post to.
// 2. Create a Meta Developer app: https://developers.facebook.com/apps
// 3. Generate a long-lived Page Access Token with pages_manage_posts +
//    pages_read_engagement (Graph API Explorer → select your Page → grant
//    those scopes → convert the short-lived token to long-lived via the
//    /oauth/access_token exchange endpoint — Meta's docs walk through this).
// 4. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env.

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookPublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

function getConfig(): { pageId: string; token: string } | null {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return null;
  return { pageId, token };
}

export function isFacebookConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Publish a text/link post, or a single-photo post, to the configured Page.
 * For video, use publishFacebookVideo instead (different endpoint).
 */
export async function publishToFacebook(opts: {
  message: string;
  imageUrl?: string;
  linkUrl?: string;
}): Promise<FacebookPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not configured" };
  }

  try {
    // Photo post: message + image go to /{page-id}/photos (caption = message)
    if (opts.imageUrl) {
      const res = await fetch(`${GRAPH_API_BASE}/${config.pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: opts.imageUrl,
          caption: opts.message,
          access_token: config.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, postId: data.post_id || data.id };
    }

    // Plain text or link post: /{page-id}/feed
    const res = await fetch(`${GRAPH_API_BASE}/${config.pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: opts.message,
        link: opts.linkUrl,
        access_token: config.token,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, postId: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

/**
 * Publish a video post. Uses a public video URL (Graph API fetches it
 * server-side) rather than a raw upload — simplest path when the video
 * already lives at a public URL (e.g. from your fal.ai / ComfyUI output).
 */
export async function publishFacebookVideo(opts: {
  videoUrl: string;
  description?: string;
}): Promise<FacebookPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not configured" };
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${config.pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: opts.videoUrl,
        description: opts.description,
        access_token: config.token,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, postId: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
