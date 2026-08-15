// AiSensy provider adapter
// ---------------------------------------------------------------------------
// Everything above this file is provider-agnostic. If AiSensy's markup rises,
// their coexistence support changes, or we move to Cloud API direct, only this
// file gets rewritten — the answer bank, stages and follow-up engine don't care.
//
// Two different AiSensy APIs exist and they are not interchangeable:
//   · Campaign API  (backend.aisensy.com/campaign/t1/api/v2)  → TEMPLATES only
//   · Project API   (apis.aisensy.com/project-apis/v1/...)    → free-form text
// We need the Project API for normal replies. It is a PRO-plan feature.

const PROJECT_ID = process.env.AISENSY_PROJECT_ID || "";
const PROJECT_KEY = process.env.AISENSY_PROJECT_API_KEY || "";
const CAMPAIGN_KEY = process.env.AISENSY_CAMPAIGN_API_KEY || "";

const PROJECT_BASE = `https://apis.aisensy.com/project-apis/v1/project/${PROJECT_ID}`;
const CAMPAIGN_URL = "https://backend.aisensy.com/campaign/t1/api/v2";

export interface InboundMessage {
  phone: string;            // E.164 without '+'
  providerMsgId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  name?: string;
  timestamp: Date;
}

/** Normalise a phone to E.164-without-plus, matching outreach-sender.ts behaviour. */
export function normalisePhone(raw: string): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  // Indian numbers arrive as 10-digit sometimes; prefix 91.
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Parse an AiSensy inbound webhook body into our shape.
 *
 * NOTE: the exact envelope is confirmed against a real payload before launch —
 * see the "log only" phase. Providers reshape fields relative to Meta's own
 * format, so we defensively read several likely paths rather than assuming one.
 */
export function normaliseInbound(body: any): InboundMessage | null {
  if (!body) return null;

  const m =
    body?.message ??
    body?.data?.message ??
    body?.messages?.[0] ??
    body;

  const phoneRaw =
    m?.from ?? m?.sender ?? m?.waId ?? m?.wa_id ??
    body?.waId ?? body?.sender?.phone ?? body?.contact?.phone;

  const id =
    m?.id ?? m?.messageId ?? m?.message_id ?? body?.id ?? body?.messageId;

  if (!phoneRaw || !id) return null;

  const text =
    m?.text?.body ?? m?.text ?? m?.body ?? m?.caption ?? "";

  const mediaUrl =
    m?.image?.url ?? m?.video?.url ?? m?.document?.url ??
    m?.audio?.url ?? m?.media?.url ?? undefined;

  const mediaType = m?.type && m.type !== "text" ? m.type : undefined;

  const tsRaw = m?.timestamp ?? body?.timestamp;
  const timestamp = tsRaw
    ? new Date(typeof tsRaw === "number" ? tsRaw * (tsRaw > 1e12 ? 1 : 1000) : tsRaw)
    : new Date();

  return {
    phone: normalisePhone(String(phoneRaw)),
    providerMsgId: String(id),
    text: String(text || "").trim(),
    mediaUrl,
    mediaType,
    name: m?.profile?.name ?? body?.contact?.name ?? undefined,
    timestamp,
  };
}

// ── sending ────────────────────────────────────────────────────────────────

async function projectPost(path: string, payload: any) {
  if (!PROJECT_ID || !PROJECT_KEY) {
    throw new Error("AISENSY_PROJECT_ID / AISENSY_PROJECT_API_KEY not configured");
  }
  const res = await fetch(`${PROJECT_BASE}${path}`, {
    method: "POST",
    // AiSensy's own docs name this header inconsistently across pages
    // (…-Pwd in the API reference, …-Pat elsewhere). Sending every variant
    // costs nothing and removes a silent-401 failure mode; once a real call
    // succeeds, check the request log and keep only the one that worked.
    headers: {
      "Content-Type": "application/json",
      "X-AiSensy-Project-API-Pwd": PROJECT_KEY,
      "X-AiSensy-Project-API-Pat": PROJECT_KEY,
      "X-AiSensy-Project-API-Key": PROJECT_KEY,
      Authorization: `Bearer ${PROJECT_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AiSensy ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

/**
 * Free-form reply. Only valid inside the 24-hour customer service window —
 * which is free, unlimited, per AiSensy's own pricing page. Outside it, this
 * will fail and you must use sendTemplate() instead.
 */
export async function sendSession(phone: string, body: string) {
  return projectPost("/messages", {
    to: normalisePhone(phone),
    type: "text",
    recipient_type: "individual",
    text: { body },
  });
}

/** Image with optional caption — used for the answer cards. */
export async function sendImage(phone: string, link: string, caption?: string) {
  return projectPost("/messages", {
    to: normalisePhone(phone),
    type: "image",
    recipient_type: "individual",
    image: { link, ...(caption ? { caption } : {}) },
  });
}

export async function sendVideo(phone: string, link: string, caption?: string) {
  return projectPost("/messages", {
    to: normalisePhone(phone),
    type: "video",
    recipient_type: "individual",
    video: { link, ...(caption ? { caption } : {}) },
  });
}

/**
 * Template send — for follow-ups after the 24-hour window has closed.
 * Utility templates cost ~Rs0.145 each on AiSensy (Meta base Rs0.115 + 26%).
 * Uses the Campaign API, which is available on lower plans than the Project API.
 */
export async function sendTemplate(
  phone: string,
  campaignName: string,
  userName: string,
  params: string[] = [],
) {
  if (!CAMPAIGN_KEY) throw new Error("AISENSY_CAMPAIGN_API_KEY not configured");
  const res = await fetch(CAMPAIGN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: CAMPAIGN_KEY,
      campaignName,
      destination: normalisePhone(phone),
      userName,
      source: "barbieverse-agent",
      templateParams: params,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AiSensy campaign ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

/** True if we can still reply free-form (and free) to this lead. */
export function windowOpen(lastInboundAt?: Date | string | null): boolean {
  if (!lastInboundAt) return false;
  const t = new Date(lastInboundAt).getTime();
  return Date.now() - t < 24 * 60 * 60 * 1000;
}
