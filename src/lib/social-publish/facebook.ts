// Facebook Page Publishing via Postiz Cloud
// Routes through Postiz Public API instead of calling Meta Graph API directly.
// The user connects their Facebook Page through Postiz's own OAuth flow,
// then hands us the integration ID from GET /integrations.
//
// Env vars:
//   POSTIZ_API_KEY — from Postiz dashboard, Settings > Developers > Public API
//   FACEBOOK_INTEGRATION_ID — from GET /integrations after connecting the Page

const POSTIZ_BASE =
  process.env.POSTIZ_BASE_URL?.replace(/\/+$/, "") || "https://api.postiz.com/public/v1";

export interface FacebookPublishResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

function getConfig(): { apiKey: string; integrationId: string } | null {
  const apiKey = process.env.POSTIZ_API_KEY;
  const integrationId = process.env.FACEBOOK_INTEGRATION_ID;
  if (!apiKey || !integrationId) return null;
  return { apiKey, integrationId };
}

export function isFacebookConfigured(): boolean {
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

async function createPost(apiKey: string, integrationId: string, opts: { content: string; image?: { id: string; path: string } }): Promise<FacebookPublishResult> {
  try {
    const body: Record<string, unknown> = {
      type: "now",
      posts: [{
        integration: { id: integrationId },
        value: [{
          content: opts.content,
          ...(opts.image ? { image: [{ id: opts.image.id, path: opts.image.path }] } : {}),
        }],
        settings: { __type: "facebook" },
      }],
    };
    const res = await fetch(`${POSTIZ_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
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
    return { ok: true, postId: data?.id || data?._id || String(res.status) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

export async function publishToFacebook(opts: {
  message: string;
  imageUrl?: string;
  linkUrl?: string;
}): Promise<FacebookPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / FACEBOOK_INTEGRATION_ID not configured" };
  }

  let image: { id: string; path: string } | undefined;
  if (opts.imageUrl) {
    const result = await uploadImage(config.apiKey, opts.imageUrl);
    if ("error" in result) {
      console.warn("[facebook] image upload failed via Postiz, posting text-only:", result.error);
    } else {
      image = result;
    }
  }

  let content = opts.message;
  if (opts.linkUrl) {
    content = `${opts.message}\n\n${opts.linkUrl}`;
  }

  return createPost(config.apiKey, config.integrationId, { content, image });
}

export async function publishFacebookVideo(opts: {
  videoUrl: string;
  description?: string;
}): Promise<FacebookPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "POSTIZ_API_KEY / FACEBOOK_INTEGRATION_ID not configured" };
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

    const body: Record<string, unknown> = {
      type: "now",
      posts: [{
        integration: { id: config.integrationId },
        value: [{
          content: opts.description || "",
          image: [{ id: uploadData.id, path: uploadData.path }],
        }],
        settings: { __type: "facebook" },
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
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) return { ok: false, error: "Postiz API key invalid or missing" };
      if (res.status === 403) return { ok: false, error: "Postiz API key valid but request rejected" };
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, postId: data?.id || data?._id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
