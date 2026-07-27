// Direct Postiz media upload.
//
// ── Why this exists ─────────────────────────────────────────────────────
// The four publishers each take an image *URL*, fetch it, and forward the
// bytes to Postiz. That works for Pollinations, which returns a public https
// URL, and is broken for ComfyUI, which returns a path relative to
// `public/generated-videos/` on whatever machine ran the generation:
//
//   - On Railway, `public/` is baked at build time and the container
//     filesystem is ephemeral, so a PNG written there at runtime is not
//     reliably served back at PUBLIC_APP_URL — the platform fetch 404s.
//   - Generating on a local machine, the file isn't reachable from the
//     internet at all.
//
// `generateImage()` already returns the raw `buffer`. Uploading those bytes
// straight to Postiz skips the whole round trip: no public hosting, no
// PUBLIC_APP_URL dependency, no ephemeral-disk problem. Postiz hands back a
// URL it hosts, which the publishers can then use like any other.

const DEFAULT_BASE = "https://api.postiz.com/public/v1";

function baseUrl(): string {
  return (process.env.POSTIZ_BASE_URL || "").replace(/\/+$/, "") || DEFAULT_BASE;
}

export interface PostizUpload {
  id: string;
  path: string;
}

/**
 * Upload raw image bytes to Postiz.
 *
 * Returns the Postiz-hosted media record. `path` is a public URL suitable for
 * passing to any of the publishers as `imageUrl`.
 */
export async function uploadBufferToPostiz(
  buffer: Buffer | Uint8Array,
  filename = `image-${Date.now()}.png`,
  contentType = "image/png",
): Promise<PostizUpload> {
  const apiKey = process.env.POSTIZ_API_KEY;
  if (!apiKey) throw new Error("POSTIZ_API_KEY not configured");

  const form = new FormData();
  // Postiz expects the field to be named "file".
  form.append("file", new Blob([buffer as BlobPart], { type: contentType }), filename);

  const res = await fetch(`${baseUrl()}/upload`, {
    method: "POST",
    // Raw key, no "Bearer " prefix — that's the MCP endpoint's convention,
    // not the REST API's.
    headers: { Authorization: apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Postiz upload failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
  }

  const data: any = await res.json().catch(() => null);
  if (!data?.path && !data?.url) {
    throw new Error("Postiz upload returned no path");
  }

  return { id: data.id, path: data.path || data.url };
}

/**
 * Turn whatever `generateImage()` produced into a URL a platform can fetch.
 *
 * Prefers uploading the raw buffer. Falls back to the returned URL when it is
 * already absolute (the Pollinations case). Returns undefined rather than
 * throwing — a missing image should degrade the post, not kill the run.
 */
export async function toPublicImageUrl(result: {
  url?: string;
  buffer?: Buffer | Uint8Array;
}): Promise<string | undefined> {
  if (result.buffer) {
    try {
      const uploaded = await uploadBufferToPostiz(result.buffer);
      return uploaded.path;
    } catch (e: any) {
      console.error("[postiz-upload] Buffer upload failed:", e?.message);
      // Fall through — an absolute URL may still work.
    }
  }

  if (result.url?.startsWith("http")) return result.url;

  // A relative path with no buffer is unusable: nothing outside this process
  // can fetch it. Better to publish without an image than with a broken one.
  if (result.url) {
    console.warn(
      `[postiz-upload] Image is a relative path (${result.url}) with no buffer to upload — dropping it`,
    );
  }
  return undefined;
}
