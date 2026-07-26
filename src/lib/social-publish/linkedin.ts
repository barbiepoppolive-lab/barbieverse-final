// LinkedIn Organization Page Publishing via Postiz Cloud
// Routes through Postiz Public API instead of calling LinkedIn's REST API
// directly. Postiz uses __type "linkedin-page" for company page posts
// (not plain "linkedin", which targets personal profiles).
//
// The user connects their LinkedIn Company Page through Postiz's own OAuth
// flow, then hands us the integration ID from GET /integrations.
//
// Falls back to Telegram manual-delivery when Postiz isn't configured,
// matching the existing fallback pattern from the original implementation
// (Community Management API access was never granted).
//
// Env vars:
//   POSTIZ_API_KEY — from Postiz dashboard, Settings > Developers > Public API
//   LINKEDIN_INTEGRATION_ID — from GET /integrations after connecting the Company Page

const POSTIZ_BASE =
  process.env.POSTIZ_BASE_URL?.replace(/\/+$/, "") || "https://api.postiz.com/public/v1";

export interface LinkedInPublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

function getConfig(): { apiKey: string; integrationId: string } | null {
  const apiKey = process.env.POSTIZ_API_KEY;
  const integrationId = process.env.LINKEDIN_INTEGRATION_ID;
  if (!apiKey || !integrationId) return null;
  return { apiKey, integrationId };
}

export function isLinkedInConfigured(): boolean {
  return getConfig() !== null;
}

async function uploadImage(apiKey: string, imageUrl: string): Promise<{ id: string; path: string } | { error: string }> {
  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return { error: `Failed to fetch source image (HTTP ${imageRes.status})` };
    const blob = await imageRes.blob();
    const formData = new FormData();
    formData.append("file", blob, "post-image.jpg");
    const uploadRes = await fetch(`${POSTIZ_BASE}/upload`, {
      method: "POST",
      headers: { Authorization: apiKey },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) return { error: uploadData?.error || `Upload failed (HTTP ${uploadRes.status})` };
    return { id: uploadData.id, path: uploadData.path };
  } catch (e: any) {
    return { error: e?.message || "unknown error uploading image" };
  }
}

/**
 * Publish a text post, optionally with a single image, via Postiz to
 * the LinkedIn Company Page.
 */
export async function publishToLinkedIn(opts: {
  text: string;
  imageUrl?: string;
  imageUrls?: string[];
  carouselName?: string;
}): Promise<LinkedInPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / LINKEDIN_INTEGRATION_ID not configured" };
  }

  const urls = opts.imageUrls && opts.imageUrls.length > 0 ? opts.imageUrls : opts.imageUrl ? [opts.imageUrl] : [];
  const images: { id: string; path: string }[] = [];
  for (const url of urls) {
    const result = await uploadImage(config.apiKey, url);
    if ("error" in result) {
      console.warn("[linkedin] image upload failed via Postiz, continuing with fewer images:", result.error);
    } else {
      images.push(result);
    }
  }

  try {
    // 2+ images with post_as_images_carousel:true renders as a swipeable
    // carousel (per docs.postiz.com/public-api/providers/linkedin) instead
    // of the default collage layout — this is how brand-manager.ts's
    // generated carousel slides become an actual LinkedIn carousel post.
    const isCarousel = images.length > 1;
    const body: Record<string, unknown> = {
      type: "now",
      posts: [{
        integration: { id: config.integrationId },
        value: [{
          content: opts.text,
          image: images.map((img) => ({ id: img.id, path: img.path })),
        }],
        settings: {
          __type: "linkedin-page",
          ...(isCarousel ? { post_as_images_carousel: true, carousel_name: opts.carouselName || "Barbieverse" } : {}),
        },
      }],
    };

    const res = await fetch(`${POSTIZ_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      if (res.status === 401) return { ok: false, error: "Postiz API key invalid or missing" };
      if (res.status === 403) return { ok: false, error: "Postiz API key valid but request rejected — check integration permissions" };
      return { ok: false, error: errData?.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, postId: data?.id || data?._id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

// ── Manual fallback (used when Postiz not configured) ──

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
 * whenever POSTIZ_API_KEY / LINKEDIN_INTEGRATION_ID aren't set.
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
    `💼 <b>LinkedIn — ready to post (Postiz not configured)</b>\n\n` +
    `Postiz Cloud is not connected to a LinkedIn Company Page integration. Copy this and post it manually as Barbieverse's page.\n\n` +
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
