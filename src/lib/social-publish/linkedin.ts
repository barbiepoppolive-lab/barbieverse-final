// LinkedIn Organization Page Publishing — official LinkedIn Posts API,
// posts to YOUR OWN company page. Same "post your own content to your own
// account" category as Facebook/Instagram/YouTube — legitimate, ToS-
// compliant automation, no scraping or engaging with other people's content
// involved (that's a different, riskier category — see src/lib/social-monitor).
//
// Realistic access note — read this before assuming this "just works" like
// Facebook/Instagram do: posting to an ORGANIZATION page needs the
// "Community Management API" product approved on a LinkedIn Developer app.
// Signing in with LinkedIn (basic OAuth) is NOT enough on its own — you
// specifically need w_organization_social granted, which means:
// 1. Create an app at https://www.linkedin.com/developers/apps
// 2. Add yourself as an admin of the Barbieverse Company Page, and verify
//    the app is associated with that page (Settings tab on the app).
// 3. Request the "Community Management API" product. LinkedIn reviews this
//    manually — approval for a small/new agency is NOT guaranteed the way
//    Meta's basic testing access is. Budget for a real chance of rejection
//    or a multi-week wait, not a same-day green light.
// 4. Once approved, generate an access token with w_organization_social
//    scope via the standard OAuth 2.0 3-legged flow, and find your
//    organization's numeric ID (Company Page → Admin tools → shows in URL,
//    or GET /rest/organizationAcls).
// 5. Set LINKEDIN_ORGANIZATION_ID and LINKEDIN_ACCESS_TOKEN.
//
// Until that's approved, isLinkedInConfigured() returns false and the
// orchestrator (index.ts) routes LinkedIn content to Telegram for manual
// posting instead — same honest fallback pattern as Moj.

const API_BASE = "https://api.linkedin.com/rest";
const LINKEDIN_API_VERSION = "202506"; // LinkedIn requires a versioned header; bump periodically per their release notes

export interface LinkedInPublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

function getConfig(): { orgId: string; token: string } | null {
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!orgId || !token) return null;
  return { orgId, token };
}

export function isLinkedInConfigured(): boolean {
  return getConfig() !== null;
}

function authorUrn(orgId: string): string {
  return `urn:li:organization:${orgId}`;
}

const commonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "LinkedIn-Version": LINKEDIN_API_VERSION,
  "X-Restli-Protocol-Version": "2.0.0",
});

/**
 * Upload an image to LinkedIn's media store and return its URN, so it can
 * be attached to a post. Two-step like Instagram's container flow: register
 * the upload (get a pre-signed URL), then PUT the bytes to it.
 */
async function uploadImage(opts: { imageUrl: string; orgId: string; token: string }): Promise<{ urn?: string; error?: string }> {
  try {
    const initRes = await fetch(`${API_BASE}/images?action=initializeUpload`, {
      method: "POST",
      headers: commonHeaders(opts.token),
      body: JSON.stringify({
        initializeUploadRequest: { owner: authorUrn(opts.orgId) },
      }),
    });
    const initData = await initRes.json();
    const uploadUrl = initData?.value?.uploadUrl;
    const imageUrn = initData?.value?.image;
    if (!initRes.ok || !uploadUrl || !imageUrn) {
      return { error: initData?.message || "Failed to initialize LinkedIn image upload" };
    }

    const imageRes = await fetch(opts.imageUrl);
    if (!imageRes.ok) {
      return { error: `Failed to fetch source image (HTTP ${imageRes.status})` };
    }
    const imageBuffer = await imageRes.arrayBuffer();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${opts.token}` },
      body: imageBuffer,
    });
    if (!putRes.ok) {
      return { error: `Image upload PUT failed (HTTP ${putRes.status})` };
    }

    return { urn: imageUrn };
  } catch (e: any) {
    return { error: e?.message || "unknown error uploading image to LinkedIn" };
  }
}

/**
 * Publish a text post, optionally with a single image, to the configured
 * organization page.
 */
export async function publishToLinkedIn(opts: {
  text: string;
  imageUrl?: string;
}): Promise<LinkedInPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "LINKEDIN_ORGANIZATION_ID / LINKEDIN_ACCESS_TOKEN not configured" };
  }

  try {
    let media: { id: string } | undefined;
    if (opts.imageUrl) {
      const { urn, error } = await uploadImage({ imageUrl: opts.imageUrl, orgId: config.orgId, token: config.token });
      if (error || !urn) {
        // Image upload failing shouldn't block a text post from going out —
        // degrade to text-only rather than failing the whole publish.
        console.warn("[linkedin] image upload failed, posting text-only:", error);
      } else {
        media = { id: urn };
      }
    }

    const body: Record<string, unknown> = {
      author: authorUrn(config.orgId),
      commentary: opts.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    if (media) {
      body.content = { media };
    }

    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: commonHeaders(config.token),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData?.message || errMsg;
      } catch {}
      return { ok: false, error: errMsg };
    }

    // LinkedIn returns the created post's URN in the x-restli-id response
    // header on success (201), not in the JSON body.
    const postId = res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || undefined;
    return { ok: true, postId };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

// ── Manual fallback (used until Community Management API is approved) ──

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export interface LinkedInDeliveryResult {
  ok: boolean;
  error?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends the finished post text to Telegram for manual posting — used
 * whenever LINKEDIN_ORGANIZATION_ID/LINKEDIN_ACCESS_TOKEN aren't set (i.e.
 * Community Management API access hasn't been approved yet).
 */
export async function deliverLinkedInContentForManualUpload(opts: {
  caption: string;
  hashtags?: string[];
  visualBrief?: string;
}): Promise<LinkedInDeliveryResult> {
  const config = getBotConfig();
  if (!config) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured" };
  }

  const hashtagLine = opts.hashtags && opts.hashtags.length > 0
    ? `\n\n${opts.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : "";

  const text =
    `💼 <b>LinkedIn — ready to post (API not yet authorized)</b>\n\n` +
    `LinkedIn's org-page posting needs Community Management API approval — until that's granted, copy this and post it manually as Barbieverse's page.\n\n` +
    `<b>Post text:</b>\n<code>${escapeHtml(opts.caption)}${escapeHtml(hashtagLine)}</code>` +
    (opts.visualBrief ? `\n\n<b>Suggested visual:</b>\n${escapeHtml(opts.visualBrief)}` : "");

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Telegram send failed: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
