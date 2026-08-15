// Meta WhatsApp Cloud API adapter — the direct, no-BSP path.
// ---------------------------------------------------------------------------
// Why this file exists: AiSensy charges Rs3,000/month for inbound webhooks on
// top of Rs3,040/month for the plan. Meta gives webhooks away. Nothing else
// about them differs — AiSensy is a reseller of this exact API.
//
// Unlike aisensy.ts, nothing here is guesswork. Meta's request and webhook
// shapes are publicly documented and versioned, so `normaliseInbound` below
// parses ONE shape rather than defensively probing several.
//
// This file is a drop-in peer of aisensy.ts: same exported function names,
// same signatures. src/lib/whatsapp/provider.ts picks between them.

const GRAPH_VERSION = process.env.WA_GRAPH_VERSION || "v21.0";
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || "";
const TOKEN = process.env.WA_CLOUD_TOKEN || "";
const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || "";

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface InboundMessage {
  phone: string;
  providerMsgId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  name?: string;
  timestamp: Date;
}

export function normalisePhone(raw: string): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** The token Meta echoes back during webhook setup. */
export function verifyWebhook(params: URLSearchParams): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

/**
 * Parse a Cloud API webhook body.
 *
 * Documented shape:
 *   entry[].changes[].value.messages[]  — inbound messages
 *   entry[].changes[].value.contacts[]  — sender profile
 *   entry[].changes[].value.statuses[]  — delivery receipts (ignored here)
 */
export function normaliseInbound(body: any): InboundMessage | null {
  if (body?.object !== "whatsapp_business_account") return null;

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const m = value?.messages?.[0];
  if (!m) return null; // status callbacks land here — not an inbound message

  let text = "";
  let mediaId: string | undefined;
  let mediaType: string | undefined;

  switch (m.type) {
    case "text":
      text = m.text?.body ?? "";
      break;
    case "button":
      text = m.button?.text ?? "";
      break;
    case "interactive":
      text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
      break;
    case "image":
    case "video":
    case "document":
    case "audio":
    case "sticker":
      mediaId = m[m.type]?.id;
      mediaType = m.type;
      text = m[m.type]?.caption ?? "";
      break;
    default:
      text = "";
  }

  return {
    phone: normalisePhone(String(m.from)),
    providerMsgId: String(m.id),
    text: String(text).trim(),
    // The media *id*, not a URL. Resolve with resolveMediaUrl() only when the
    // bytes are actually needed — these links expire in ~5 minutes.
    mediaUrl: mediaId,
    mediaType,
    name: value?.contacts?.[0]?.profile?.name,
    timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date(),
  };
}

/** Exchange a media id for a short-lived download URL. */
export async function resolveMediaUrl(mediaId: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.url ?? null;
  } catch {
    return null;
  }
}

async function send(payload: any) {
  if (!PHONE_NUMBER_ID || !TOKEN) {
    throw new Error("WA_PHONE_NUMBER_ID / WA_CLOUD_TOKEN not configured");
  }
  const res = await fetch(`${GRAPH}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cloud API ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function sendSession(phone: string, body: string) {
  return send({
    to: normalisePhone(phone),
    type: "text",
    // preview_url off: link previews on a referral URL render the app's own
    // branding, which is the thing we go out of our way not to show.
    text: { body, preview_url: false },
  });
}

export async function sendImage(phone: string, link: string, caption?: string) {
  return send({
    to: normalisePhone(phone),
    type: "image",
    image: { link, ...(caption ? { caption } : {}) },
  });
}

export async function sendVideo(phone: string, link: string, caption?: string) {
  return send({
    to: normalisePhone(phone),
    type: "video",
    video: { link, ...(caption ? { caption } : {}) },
  });
}

/**
 * Template send, for outside the 24-hour window.
 * `params` fill {{1}}, {{2}}, … in the body, in order.
 */
export async function sendTemplate(
  phone: string,
  templateName: string,
  _userName: string,
  params: string[] = [],
  languageCode = "en",
) {
  return send({
    to: normalisePhone(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(params.length
        ? {
            components: [
              {
                type: "body",
                parameters: params.map((p) => ({ type: "text", text: p })),
              },
            ],
          }
        : {}),
    },
  });
}

export function windowOpen(lastInboundAt?: Date | string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

/**
 * Confirm the app is actually subscribed to the WABA's webhooks.
 *
 * This is the step that silently fails: Meta's newer dashboard verifies your
 * callback URL and shows it as configured, while never registering the
 * app↔WABA subscription — so the endpoint is live and simply never called.
 */
export async function checkSubscription(wabaId: string) {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return { status: res.status, body: (await res.text()).slice(0, 400) };
}

/** Register this app against the WABA. Idempotent. */
export async function subscribeApp(wabaId: string) {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return { status: res.status, body: (await res.text()).slice(0, 400) };
}
