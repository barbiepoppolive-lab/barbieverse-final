// YouTube Publishing — official YouTube Data API v3, uploads to YOUR OWN
// channel. Same "post your own content to your own account" category as
// Facebook/Instagram — legitimate, ToS-compliant automation.
//
// IMPORTANT — this is NOT the same credential as YOUTUBE_API_KEY already in
// .env. That key is a simple API key used elsewhere in this app for
// read-only search (finding creators to scout). Uploading video requires
// OAuth 2.0 with the youtube.upload scope — Google does not allow uploads
// via API key at all, on any channel, for anyone. Concretely that means:
//
// 1. Create a Google Cloud project (or reuse one), enable "YouTube Data
//    API v3" at https://console.cloud.google.com.
// 2. Create an OAuth 2.0 Client ID (type: Desktop app) under
//    Credentials → Create Credentials → OAuth client ID.
// 3. Run a ONE-TIME manual consent flow as the channel owner to get a
//    refresh token (this is not an admin panel step — it's a one-time
//    setup task; Google's OAuth Playground at
//    https://developers.google.com/oauthplayground works: paste your own
//    Client ID/Secret in its settings gear, select the
//    youtube.upload + youtube.readonly scopes, authorize with the
//    channel's Google account, then exchange for a refresh token).
// 4. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.
//
// Also note: YouTube "Community posts" (text-only updates, no video) have
// NO public create API from Google at all — verified, this isn't a config
// gap, it simply doesn't exist to call. So unlike Facebook/Instagram, there
// is no text/image-only path here: every YouTube publish needs an actual
// video file at a public URL. No video URL → skip, same shape as
// Instagram's "no image → skip" rule.
//
// Google also gates uploads for public videos behind an OAuth verification
// review for production apps requesting sensitive scopes. Uploading as
// "unlisted" or "private" from a Testing-mode OAuth client (not yet
// verified) works fine for your own channel without waiting on that review
// — set privacyStatus accordingly below until/unless you go through it.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export interface YouTubePublishResult {
  ok: boolean;
  videoId?: string;
  error?: string;
}

function getConfig(): { clientId: string; clientSecret: string; refreshToken: string } | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

export function isYouTubeConfigured(): boolean {
  return getConfig() !== null;
}

async function getAccessToken(): Promise<{ token?: string; error?: string }> {
  const config = getConfig();
  if (!config) return { error: "YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN not configured" };

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return { error: data?.error_description || data?.error || `Token refresh failed (HTTP ${res.status})` };
    }
    return { token: data.access_token };
  } catch (e: any) {
    return { error: e?.message || "unknown error refreshing token" };
  }
}

/** First line (or first ~100 chars) of the caption, as YouTube's separate required title field. */
function deriveTitle(caption: string): string {
  const firstLine = caption.split("\n")[0].trim();
  return firstLine.length > 0 && firstLine.length <= 100 ? firstLine : caption.slice(0, 97).trim() + (caption.length > 97 ? "..." : "");
}

/**
 * Upload a video (works for both regular uploads and Shorts — Shorts is
 * just a normal upload where the video is vertical/square and <=60s;
 * YouTube auto-detects and surfaces it in the Shorts shelf, there's no
 * separate "Shorts endpoint").
 *
 * `videoUrl` must be a publicly fetchable URL — this function fetches the
 * bytes server-side and streams them into YouTube's resumable upload
 * session in one shot (fine for short clips; very large files would need
 * real chunking, not implemented here since this app's clips are short-form).
 */
export async function publishYouTubeVideo(opts: {
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  privacyStatus?: "public" | "unlisted" | "private";
}): Promise<YouTubePublishResult> {
  const { token, error: tokenError } = await getAccessToken();
  if (!token) {
    return { ok: false, error: tokenError || "Failed to obtain access token" };
  }

  try {
    // Fetch the source video bytes first so we know Content-Length upfront
    // (lets us do the whole upload in a single PUT instead of chunking).
    const videoRes = await fetch(opts.videoUrl);
    if (!videoRes.ok) {
      return { ok: false, error: `Failed to fetch source video (HTTP ${videoRes.status})` };
    }
    const videoBuffer = await videoRes.arrayBuffer();

    const description = [opts.caption, opts.hashtags?.length ? opts.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : ""]
      .filter(Boolean)
      .join("\n\n");

    // Step 1: initiate the resumable upload session
    const initRes = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": String(videoBuffer.byteLength),
      },
      body: JSON.stringify({
        snippet: {
          title: deriveTitle(opts.caption),
          description,
          tags: opts.hashtags?.map((h) => h.replace(/^#/, "")),
        },
        status: {
          privacyStatus: opts.privacyStatus || "unlisted",
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    if (!initRes.ok) {
      const errBody = await initRes.text();
      return { ok: false, error: `Failed to initiate upload session (HTTP ${initRes.status}): ${errBody}` };
    }

    const uploadSessionUrl = initRes.headers.get("Location");
    if (!uploadSessionUrl) {
      return { ok: false, error: "No upload session URL returned by YouTube" };
    }

    // Step 2: PUT the actual video bytes to the session URL
    const putRes = await fetch(uploadSessionUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/*",
        "Content-Length": String(videoBuffer.byteLength),
      },
      body: videoBuffer,
    });

    const putData = await putRes.json();
    if (!putRes.ok || !putData.id) {
      return { ok: false, error: putData?.error?.message || `Upload failed (HTTP ${putRes.status})` };
    }

    return { ok: true, videoId: putData.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
