// Instagram Content Publishing via Postiz Cloud
// Routes through Postiz Public API instead of calling Meta Graph API directly.
// The user connects their Instagram account through Postiz's own OAuth flow,
// then hands us the integration ID from GET /integrations.
//
// Postiz supports __type "instagram" (FB-linked business account) and
// "instagram-standalone" (direct IG connection). Either works — use whichever
// Postiz shows. The integration ID already encodes which type it is.
//
// Env vars:
//   POSTIZ_API_KEY — from Postiz dashboard, Settings > Developers > Public API
//   INSTAGRAM_INTEGRATION_ID — from GET /integrations after connecting the account

const POSTIZ_BASE =
  process.env.POSTIZ_BASE_URL?.replace(/\/+$/, "") || "https://api.postiz.com/public/v1";

export interface InstagramPublishResult {
  ok: boolean;
  mediaId?: string;
  error?: string;
}

function getConfig(): { apiKey: string; integrationId: string } | null {
  const apiKey = process.env.POSTIZ_API_KEY;
  const integrationId = process.env.INSTAGRAM_INTEGRATION_ID;
  if (!apiKey || !integrationId) return null;
  return { apiKey, integrationId };
}

export function isInstagramConfigured(): boolean {
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

async function uploadVideo(apiKey: string, videoUrl: string): Promise<{ id: string; path: string } | { error: string }> {
  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return { error: `Failed to fetch source video (HTTP ${videoRes.status})` };
    const blob = await videoRes.blob();
    const formData = new FormData();
    formData.append("file", blob, "post-video.mp4");
    const uploadRes = await fetch(`${POSTIZ_BASE}/upload`, {
      method: "POST",
      headers: { Authorization: apiKey },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) return { error: uploadData?.error || `Upload failed (HTTP ${uploadRes.status})` };
    return { id: uploadData.id, path: uploadData.path };
  } catch (e: any) {
    return { error: e?.message || "unknown error uploading video" };
  }
}

/**
 * Publish an image post — a single photo, a multi-image carousel (pass 2+
 * URLs), or a Story (postType: "story", 24h visibility, always single image).
 * Carousel = same "post" post_type, just multiple images in one call; that's
 * literally how Postiz's Instagram API distinguishes them (see /public-api/
 * providers/instagram docs — no separate carousel endpoint).
 */
export async function publishInstagramImage(opts: {
  imageUrl?: string;
  imageUrls?: string[];
  caption: string;
  postType?: "post" | "story";
}): Promise<InstagramPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / INSTAGRAM_INTEGRATION_ID not configured" };
  }

  const urls = opts.imageUrls && opts.imageUrls.length > 0 ? opts.imageUrls : opts.imageUrl ? [opts.imageUrl] : [];
  if (urls.length === 0) {
    return { ok: false, error: "No image URL(s) provided" };
  }

  const uploaded: { id: string; path: string }[] = [];
  for (const url of urls) {
    const image = await uploadImage(config.apiKey, url);
    if ("error" in image) return { ok: false, error: image.error };
    uploaded.push(image);
  }

  try {
    const body: Record<string, unknown> = {
      type: "now",
      posts: [{
        integration: { id: config.integrationId },
        value: [{
          content: opts.caption,
          image: uploaded.map((img) => ({ id: img.id, path: img.path })),
        }],
        settings: { __type: "instagram", post_type: opts.postType || "post" },
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
    return { ok: true, mediaId: data?.id || data?._id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

/**
 * Publish a Reel/video post with a caption.
 */
export async function publishInstagramVideo(opts: {
  videoUrl: string;
  caption: string;
  isReel?: boolean;
}): Promise<InstagramPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / INSTAGRAM_INTEGRATION_ID not configured" };
  }

  const video = await uploadVideo(config.apiKey, opts.videoUrl);
  if ("error" in video) return { ok: false, error: video.error };

  try {
    const body: Record<string, unknown> = {
      type: "now",
      posts: [{
        integration: { id: config.integrationId },
        value: [{
          content: opts.caption,
          image: [{ id: video.id, path: video.path }],
        }],
        settings: { __type: "instagram" },
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
    return { ok: true, mediaId: data?.id || data?._id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
