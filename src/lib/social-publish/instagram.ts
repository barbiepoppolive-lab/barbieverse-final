// Instagram Content Publishing — official Graph API (Instagram rides on the
// same graph.facebook.com API as Facebook Pages since Meta merged them).
//
// Setup (this one has real upfront overhead — budget time for it):
// 1. Your Instagram account must be a Business or Creator account (Settings
//    → Account type — a personal account cannot be posted to via API at all).
// 2. Link it to a Facebook Page (Instagram settings → Linked Accounts).
// 3. Create/reuse a Meta Developer app, add the Instagram Graph API product.
// 4. Request instagram_basic + instagram_content_publish permissions. Basic
//    testing works immediately with your own account as a "test user" —
//    production access for anyone else requires Meta App Review + Business
//    Verification (expect this to take days, not minutes).
// 5. Set INSTAGRAM_BUSINESS_ACCOUNT_ID (the numeric IG user id, not your
//    @handle — found via GET /{page-id}?fields=instagram_business_account)
//    and INSTAGRAM_ACCESS_TOKEN (falls back to FACEBOOK_PAGE_ACCESS_TOKEN if
//    unset — the same long-lived token usually carries both scopes when
//    generated from the same app).
//
// Publishing is a two-step process: create a media "container" pointing at
// a public image/video URL, then publish that container. Video containers
// need processing time on Meta's side before they're publishable, hence the
// polling loop below.

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const CONTAINER_POLL_INTERVAL_MS = 3000;
const CONTAINER_POLL_MAX_ATTEMPTS = 20; // ~60s — images are near-instant, video can take longer

export interface InstagramPublishResult {
  ok: boolean;
  mediaId?: string;
  error?: string;
}

function getConfig(): { igUserId: string; token: string } | null {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!igUserId || !token) return null;
  return { igUserId, token };
}

export function isInstagramConfigured(): boolean {
  return getConfig() !== null;
}

async function waitForContainerReady(
  containerId: string,
  token: string
): Promise<{ ready: boolean; error?: string }> {
  for (let attempt = 0; attempt < CONTAINER_POLL_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();
    const status = data.status_code;

    if (status === "FINISHED") return { ready: true };
    if (status === "ERROR") return { ready: false, error: "Container processing failed on Meta's side" };

    await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL_MS));
  }
  return { ready: false, error: "Container never finished processing (timed out)" };
}

/**
 * Publish a single image post with a caption.
 */
export async function publishInstagramImage(opts: {
  imageUrl: string;
  caption: string;
}): Promise<InstagramPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "INSTAGRAM_BUSINESS_ACCOUNT_ID / access token not configured" };
  }

  try {
    // Step 1: create the media container
    const createRes = await fetch(`${GRAPH_API_BASE}/${config.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: opts.imageUrl,
        caption: opts.caption,
        access_token: config.token,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      return { ok: false, error: createData?.error?.message || "Failed to create media container" };
    }

    // Step 2: wait for it to be ready, then publish
    const { ready, error } = await waitForContainerReady(createData.id, config.token);
    if (!ready) return { ok: false, error };

    const publishRes = await fetch(`${GRAPH_API_BASE}/${config.igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: config.token,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { ok: false, error: publishData?.error?.message || "Failed to publish container" };
    }

    return { ok: true, mediaId: publishData.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}

/**
 * Publish a Reel/video post with a caption. Video containers take longer to
 * process than images, which is why the poll budget above matters more here.
 */
export async function publishInstagramVideo(opts: {
  videoUrl: string;
  caption: string;
  isReel?: boolean;
}): Promise<InstagramPublishResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "INSTAGRAM_BUSINESS_ACCOUNT_ID / access token not configured" };
  }

  try {
    const createRes = await fetch(`${GRAPH_API_BASE}/${config.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: opts.isReel === false ? "VIDEO" : "REELS",
        video_url: opts.videoUrl,
        caption: opts.caption,
        access_token: config.token,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      return { ok: false, error: createData?.error?.message || "Failed to create media container" };
    }

    const { ready, error } = await waitForContainerReady(createData.id, config.token);
    if (!ready) return { ok: false, error };

    const publishRes = await fetch(`${GRAPH_API_BASE}/${config.igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: config.token,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { ok: false, error: publishData?.error?.message || "Failed to publish container" };
    }

    return { ok: true, mediaId: publishData.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
