// YouTube Publishing via Postiz Cloud
// Routes through Postiz Public API instead of calling YouTube Data API directly.
// The user connects their YouTube channel through Postiz's own OAuth flow,
// then hands us the integration ID from GET /integrations.
//
// YouTube posts in Postiz need __type "youtube" with settings including
// title, tags, privacy, and thumbnail — wrapping the Postiz API shape
// while reusing the title-derivation logic from the old direct implementation.
//
// Env vars:
//   POSTIZ_API_KEY — from Postiz dashboard, Settings > Developers > Public API
//   YOUTUBE_INTEGRATION_ID — from GET /integrations after connecting the channel

import { sendTelegramImages } from "./telegram-media";

const POSTIZ_BASE =
  process.env.POSTIZ_BASE_URL?.replace(/\/+$/, "") || "https://api.postiz.com/public/v1";

export interface YouTubePublishResult {
  ok: boolean;
  videoId?: string;
  error?: string;
}

function getConfig(): { apiKey: string; integrationId: string } | null {
  const apiKey = process.env.POSTIZ_API_KEY;
  const integrationId = process.env.YOUTUBE_INTEGRATION_ID;
  if (!apiKey || !integrationId) return null;
  return { apiKey, integrationId };
}

export function isYouTubeConfigured(): boolean {
  return getConfig() !== null;
}

function deriveTitle(caption: string): string {
  const firstLine = caption.split("\n")[0].trim();
  return firstLine.length > 0 && firstLine.length <= 100 ? firstLine : caption.slice(0, 97).trim() + (caption.length > 97 ? "..." : "");
}

/**
 * Upload a video to Postiz's media store, then create a YouTube post.
 */
export async function publishYouTubeVideo(opts: {
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  privacyStatus?: "public" | "unlisted" | "private";
}): Promise<YouTubePublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / YOUTUBE_INTEGRATION_ID not configured" };
  }

  try {
    const videoRes = await fetch(opts.videoUrl);
    if (!videoRes.ok) return { ok: false, error: `Failed to fetch source video (HTTP ${videoRes.status})` };
    const blob = await videoRes.blob();
    const formData = new FormData();
    formData.append("file", blob, "post-video.mp4");
    const uploadRes = await fetch(`${POSTIZ_BASE}/upload`, {
      method: "POST",
      headers: { Authorization: config.apiKey },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) return { ok: false, error: uploadData?.error || `Video upload failed (HTTP ${uploadRes.status})` };

    const tags = opts.hashtags?.map((h) => h.replace(/^#/, "")) || [];
    const now = new Date().toISOString();

    const body = {
      // "now" = publish immediately. "schedule" requires a future date and
      // was causing every post here to fail with a 400 Bad Request.
      type: "now",
      creationMethod: "API",
      date: now,
      shortLink: true,
      tags: [] as string[],
      posts: [{
        integration: { id: config.integrationId },
        value: [{ content: opts.caption, image: [], delay: 0 }],
        settings: {
          __type: "youtube",
          title: deriveTitle(opts.caption),
          tags,
          thumbnail: { id: uploadData.id, path: uploadData.path },
          status: opts.privacyStatus || "unlisted",
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
      if (res.status === 403) return { ok: false, error: "Postiz API key valid but request rejected" };
      return { ok: false, error: errData?.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, videoId: data?.id || data?._id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

// ── Manual fallback (used until video generation is wired in) ──
// YouTube has no text/image-only post type — every upload needs an actual
// video file. This app can generate images but not video yet, so rather
// than silently reporting "skipped" every single day, deliver a ready
// script + thumbnail brief to Telegram so there's still something to film
// and upload by hand. Same honest pattern as Moj.

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export interface YouTubeDeliveryResult {
  ok: boolean;
  error?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function deliverYouTubeContentForManualUpload(opts: {
  caption: string;
  hashtags?: string[];
  visualBrief?: string;
  imageUrl?: string;
}): Promise<YouTubeDeliveryResult> {
  const config = getBotConfig();
  if (!config) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured" };
  }

  // Thumbnail/vibe reference — was being generated and discarded before.
  await sendTelegramImages({ imageUrl: opts.imageUrl, label: "🎬 YouTube — thumbnail reference" });

  const hashtagLine = opts.hashtags && opts.hashtags.length > 0
    ? `\n\n${opts.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : "";

  const text =
    `🎬 <b>YouTube — script ready (no video file yet)</b>\n\n` +
    `Video generation isn't wired in yet, so this one needs filming/editing by hand — title, description, and tags below, ready to paste once you upload.\n\n` +
    `<b>Title/description:</b>\n<code>${escapeHtml(opts.caption)}${escapeHtml(hashtagLine)}</code>` +
    (opts.visualBrief ? `\n\n<b>What to film:</b>\n${escapeHtml(opts.visualBrief)}` : "");

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
