// WhatsApp auto-reply — unofficial client (whatsapp-web.js / linked device)
// ---------------------------------------------------------------------------
// READ THIS BEFORE CHANGING ANYTHING.
//
// This connects the way WhatsApp Web does: a linked device, driven by a
// headless browser. It is NOT the official API and it breaks WhatsApp's terms.
// The realistic penalty is a ban on the number — the same number Barbie's Meta
// ads point at, holding 122 live conversations.
//
// Barbie chose this route knowingly. Everything below exists to make a banned
// number less likely, because the naive version of this script is what gets
// numbers killed. Every rail here maps to a specific detection signal:
//
//   • humans do not reply in 0 ms            -> randomised think-time
//   • humans do not answer 60 chats an hour  -> hourly + per-contact caps
//   • humans do not auto-reply inside groups -> group/broadcast/status filter
//   • humans stop when told to stop          -> opt-out list, permanent
//   • bots that repeat themselves get reported-> per-contact topic memory
//
// If you remove a rail, you are not simplifying the code. You are spending
// Barbie's business.

import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import {
  matchAnswer,
  needsEscalation,
  complianceCheck,
  ANSWERS,
} from "./answer-bank";

if (!process.env.RAILWAY_PROJECT_ID) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });
  } catch {}
}

// ── configuration ──────────────────────────────────────────────────────────
const APPROVE_MODE = (process.env.WA_APPROVE_MODE || "all-auto") as
  | "all-manual"
  | "canned-auto"
  | "all-auto";

// Session lives on a Railway volume. Without this the container's disk is wiped
// on every deploy and WhatsApp demands a fresh QR scan each time.
const SESSION_DIR = process.env.WA_SESSION_DIR || "/data/wwebjs_auth";

// Rate limits: inbound replies are unlimited (we only reply to people who message us).
// Set very high defaults so the checks are effectively no-ops while keeping the
// code available for if Barbie wants to re-enable caps later.
const MAX_REPLIES_PER_HOUR = Number(
  process.env.WA_MAX_REPLIES_PER_HOUR || 9999,
);
const MAX_REPLIES_PER_CONTACT_PER_DAY = Number(
  process.env.WA_MAX_PER_CONTACT_DAY || 999,
);
const MIN_DELAY_MS = Number(process.env.WA_MIN_DELAY_MS || 3_000);
const MAX_DELAY_MS = Number(process.env.WA_MAX_DELAY_MS || 12_000);

// Pause toggle: WA_BOT_PAUSED=true shuts off all replies without killing the process.
let botPaused = process.env.WA_BOT_PAUSED === "true";

const MEDIA_BASE = process.env.PUBLIC_APP_URL || "https://barbieverse.org";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const OPTOUT_FILE = path.join(SESSION_DIR, "optouts.json");
const SEEN_FILE = path.join(SESSION_DIR, "seen.json");

fs.mkdirSync(SESSION_DIR, { recursive: true });

// ── persistence (survives restarts via the volume) ─────────────────────────
function loadJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function saveJson(file: string, data: unknown) {
  try {
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (e) {
    console.error("[wa] could not persist", file, e);
  }
}

const optOuts = new Set<string>(loadJson<string[]>(OPTOUT_FILE, []));
// message ids already handled — prevents double-replies after a restart
const seenIds = new Set<string>(loadJson<string[]>(SEEN_FILE, []).slice(-2000));
const leadTopics = new Map<string, string[]>();
const contactCounts = new Map<string, { day: string; n: number }>();
let hourStamp = new Date().getUTCHours();
let repliesThisHour = 0;

function persistSeen() {
  saveJson(SEEN_FILE, [...seenIds].slice(-2000));
}

// ── telegram ───────────────────────────────────────────────────────────────
async function tg(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("[wa] telegram failed", e);
  }
}

/** Send media (photo/video) to Barbie via Telegram. */
async function tgMedia(caption: string, media: any, filename: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    const isVideo = media.mimetype?.startsWith("video/");
    const endpoint = isVideo ? "sendVideo" : "sendPhoto";
    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHAT);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    const blob = new Blob([Buffer.from(media.data, "base64")], {
      type: media.mimetype,
    });
    formData.append(isVideo ? "video" : "photo", blob, filename);
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    console.error("[wa] telegram media failed", e);
    // Fallback: send text only
    await tg(caption);
  }
}

/**
 * The QR must reach Barbie's phone — she cannot read a container's stdout.
 *
 * NOTE: fetch only throws on network failure. A Telegram rejection (bad
 * chat_id, malformed upload) returns 4xx and looked exactly like success in
 * the previous version, which is why QRs "sent" for minutes and never arrived.
 * Always read the body.
 */
async function tgPhoto(pngBuffer: Buffer, caption: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) {
    console.error("[wa] telegram not configured — cannot deliver QR");
    return;
  }
  try {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT);
    form.append("caption", caption);
    form.append(
      "photo",
      new Blob([pngBuffer], { type: "image/png" }),
      "qr.png",
    );
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
      {
        method: "POST",
        body: form,
      },
    );
    const body = await res.text();
    if (!res.ok)
      console.error(
        `[wa] telegram sendPhoto ${res.status}: ${body.slice(0, 300)}`,
      );
    else console.log("[wa] QR delivered to Telegram");
  } catch (e) {
    console.error("[wa] telegram photo threw:", e);
  }
}

// ── LLM long-tail (optional) ───────────────────────────────────────────────
async function writeReply(
  text: string,
  topicsAsked: string[] = [],
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const seen = new Set(topicsAsked);
  const facts = ANSWERS.filter((a) => !seen.has(a.id))
    .map((a) => `${a.id}: ${a.reply}`)
    .join("\n\n");

  const systemPrompt = `Barbie ki WhatsApp agent. Roman Hinglish mein jawab do.
Short messages (2-4 lines max). "sister"/"aap" se address karo.
Barbie ORAT hai — hamesha "deti hoon", "kar dungi" likho, kabhi "deta hoon" nahi.
Money facts LOCKED hai — ye kabhi mat badlo:
${facts || "(sawal already cover ho chuka hai — naya jawab do, facts same rakhna)"}

Rules:
- "guarantee" mat likho
- App ka naam mat likho
- Rupee figure apne se mat banao
- Hamesha agla step ya chota sawaal ke saath khatam karo`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;
    return complianceCheck(reply).ok ? reply : null;
  } catch {
    return null;
  }
}

// ── rate limiting ──────────────────────────────────────────────────────────
function hourlyBudgetLeft(): boolean {
  const h = new Date().getUTCHours();
  if (h !== hourStamp) {
    hourStamp = h;
    repliesThisHour = 0;
  }
  return repliesThisHour < MAX_REPLIES_PER_HOUR;
}

function contactBudgetLeft(phone: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const rec = contactCounts.get(phone);
  if (!rec || rec.day !== today) {
    contactCounts.set(phone, { day: today, n: 0 });
    return true;
  }
  return rec.n < MAX_REPLIES_PER_CONTACT_PER_DAY;
}

function noteReply(phone: string) {
  repliesThisHour++;
  const today = new Date().toISOString().slice(0, 10);
  const rec = contactCounts.get(phone);
  contactCounts.set(
    phone,
    rec && rec.day === today
      ? { day: today, n: rec.n + 1 }
      : { day: today, n: 1 },
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Multi-phase typing simulation — mimics how a real person actually types.
 * Phase 1: brief pause (reading the message)
 * Phase 2: start typing (sendStateTyping)
 * Phase 3: burst of typing, brief pause (thinking of what to say)
 * Phase 4: finish typing, send
 * Longer messages take longer to type. Occasional longer pauses mixed in.
 */
async function humanTyping(msg: any, replyLength: number) {
  // Phase 1: read the message (0.5-2s)
  await sleep(500 + Math.random() * 1500);

  // Phase 2: start typing indicator
  try {
    await (await msg.getChat()).sendStateTyping();
  } catch {}

  // Phase 3: first typing burst (1-3s)
  await sleep(1000 + Math.random() * 2000);

  // Phase 4: brief pause mid-think (0.3-1.5s) — like pausing to think
  if (Math.random() > 0.4) {
    try {
      await (await msg.getChat()).sendStateTyping();
    } catch {}
    await sleep(300 + Math.random() * 1200);
  }

  // Phase 5: finish typing — longer for longer messages
  const typingDuration =
    Math.min(replyLength * 15, 6000) + Math.random() * 2000;
  try {
    await (await msg.getChat()).sendStateTyping();
  } catch {}
  await sleep(typingDuration);
}

const OPT_OUT =
  /\b(stop|unsubscribe|band karo|mat bhejo|message mat|block|don'?t message|do not message|nahi chahiye|not interested)\b/i;

// ── client ─────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    // Must come from env. A hardcoded Windows path made this unrunnable
    // anywhere but one laptop, while the README promised Railway deploys.
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    // NOTE: --single-process and --no-zygote are deliberately ABSENT.
    // With them, whatsapp-web.js authenticates and then hangs forever before
    // emitting `ready` — the session links, the logs look healthy, and no
    // message is ever processed. Do not re-add them to "save memory".
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  },
  authTimeoutMs: 180_000,
});

// Latest QR, held in memory and served over HTTP as a fallback. Telegram
// delivery has proven unreliable and a QR nobody can see is a dead bot.
let currentQrPng: Buffer | null = null;
let currentQrAt = 0;
// Surfaced on /qr.json so "is it actually working?" is answerable without logs.
let isReady = false;
let messagesSeen = 0;

client.on("qr", async (qr) => {
  try {
    currentQrPng = await QRCode.toBuffer(qr, { width: 512, margin: 2 });
    currentQrAt = Date.now();
    console.log(
      `[wa] QR ready — open /qr?k=... to scan (also attempting Telegram)`,
    );
    await tgPhoto(
      currentQrPng,
      "📱 Scan within 60 seconds:\nWhatsApp → Settings → Linked devices → Link a device",
    );
  } catch (e) {
    console.error("[wa] QR render failed", e);
  }
});

client.on("ready", async () => {
  isReady = true;
  const me = client.info?.wid?.user;
  console.log("[wa] connected as", me);
  // Barbie must SEE which number linked. The whole disaster earlier today was
  // a message that sent successfully from the wrong number.
  await tg(
    `✅ <b>WhatsApp bot connected</b>\nLinked number: <b>+${me}</b>\n\nMode: ${APPROVE_MODE}\nCaps: ${MAX_REPLIES_PER_HOUR}/hour, ${MAX_REPLIES_PER_CONTACT_PER_DAY}/contact/day\n\nIf this is NOT your business number, stop the service now.`,
  );
});

client.on("authenticated", () =>
  console.log("[wa] authenticated, session saved to", SESSION_DIR),
);

// Visibility into the gap between `authenticated` and `ready`. That gap is
// where this silently died: linked, logs clean, no messages ever handled.
client.on("loading_screen", (percent, message) =>
  console.log(`[wa] loading ${percent}% ${message || ""}`),
);
client.on("change_state", (state) => console.log("[wa] state:", state));
client.on("auth_failure", async (m) => {
  console.error("[wa] auth failure", m);
  await tg(`❌ WhatsApp auth failed: ${m}`);
});
client.on("disconnected", async (r) => {
  console.log("[wa] disconnected:", r);
  await tg(`⚠️ WhatsApp bot disconnected: ${r}`);
});

client.on("message", async (msg: any) => {
  try {
    messagesSeen++;
    if (msg.fromMe || msg.isStatus) return;

    // Groups, broadcasts and status. Auto-replying in a group is the single
    // most visible "this is a bot" signal there is, and it annoys people who
    // never asked us anything.
    const from: string = msg.from || "";
    if (
      from.endsWith("@g.us") ||
      from.includes("broadcast") ||
      from.includes("status")
    )
      return;

    // Pause toggle — check env first, then the in-memory flag (toggled via HTTP)
    if (process.env.WA_BOT_PAUSED === "true" || botPaused) {
      console.log(`[wa] paused — ignoring +${(from || "").replace(/@.*/, "")}`);
      return;
    }

    if (msg.id?._serialized && seenIds.has(msg.id._serialized)) return;
    if (msg.id?._serialized) {
      seenIds.add(msg.id._serialized);
      persistSeen();
    }

    // WhatsApp now addresses individuals by LID (…@lid), not phone number, so
    // stripping "@c.us" leaves an unusable id like 234002787123445@lid. That is
    // fine as a map key but useless in an alert — Barbie cannot act on an
    // escalation she cannot identify. Resolve to the real number where we can,
    // and keep the raw id as the stable key.
    const key = from.replace(/@(c\.us|lid)$/, "");
    let phone = key;
    let contactName = "";
    try {
      const contact = await msg.getContact();
      const resolved = contact?.number || contact?.id?.user;
      if (resolved && /^\d{8,15}$/.test(String(resolved)))
        phone = String(resolved);
      // Sync contact name back to the database
      contactName = contact?.pushname || contact?.name || "";
      if (contactName && phone) {
        const syncUrl =
          process.env.VERCEL_SYNC_URL || "https://barbieverse.org";
        fetch(`${syncUrl}/api/public/whatsapp-sync-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, name: contactName }),
        }).catch(() => {}); // fire and forget
      }
    } catch {
      /* keep the key */
    }

    if (optOuts.has(key)) return; // permanent, no exceptions

    const text = (msg.body || "").trim();

    // Media with no caption: acknowledge, tell Barbie, do not improvise.
    if (msg.hasMedia && !text) {
      const media = await msg.downloadMedia();
      const mediaType = msg.type; // "image", "video", "audio", "document"
      const caption =
        mediaType === "video"
          ? `🎬 <b>Video from +${phone}</b>\nCheck it and reply yourself.`
          : `📷 <b>Screenshot from +${phone}</b>\nCheck it and reply yourself.`;

      // Forward to Barbie via Telegram with the media attached
      if (media) {
        await tgMedia(caption, media, `wa-media-${Date.now()}`);
      } else {
        await tg(caption);
      }

      // Acknowledge to the lead
      await humanTyping(msg, 40);
      await msg.reply(
        mediaType === "video"
          ? "Video dekh li sister 👍 main abhi check karti hoon"
          : "Screenshot mil gya sister 👍 main abhi dekh ke batati hoon",
      );
      noteReply(key);
      return;
    }
    if (!text) return;

    console.log(`[wa] <- +${phone}: ${text.slice(0, 80)}`);

    // Opt-out is checked BEFORE anything else can generate a reply.
    if (OPT_OUT.test(text)) {
      optOuts.add(key);
      saveJson(OPTOUT_FILE, [...optOuts]);
      await tg(
        `🚫 <b>+${phone} opted out</b> — added to permanent do-not-reply.\n"${text.slice(0, 150)}"`,
      );
      return;
    }

    const escalation = needsEscalation(text);
    if (escalation) {
      // Stay silent. Barbie answers money, refunds, anger and anything about a
      // minor herself — an automated reply to those is how real damage happens.
      await tg(
        `🚨 <b>Escalation — ${escalation}</b>\n+${phone}\n\n"${text.slice(0, 300)}"\n\nBot stayed silent. This one is yours.`,
      );
      return;
    }

    const answer = matchAnswer(text);
    const topics = leadTopics.get(key) || [];
    if (answer && !topics.includes(answer.id)) {
      topics.push(answer.id);
      leadTopics.set(key, topics);
    }

    let replyText: string | null = null;
    let source = "canned";
    if (answer) {
      replyText = [answer.reply, answer.nextNudge].filter(Boolean).join("\n\n");
      source = `canned:${answer.id}`;
    } else if (APPROVE_MODE === "all-auto") {
      replyText = await writeReply(text, topics);
      source = "llm";
    }

    if (!replyText) {
      await tg(
        `❓ <b>+${phone}</b> — no canned answer matched.\n"${text.slice(0, 200)}"\n\nReply by hand.`,
      );
      return;
    }

    const gate = complianceCheck(replyText);
    if (!gate.ok) {
      await tg(`⛔ Blocked reply to +${phone}: ${gate.issues.join("; ")}`);
      return;
    }

    // Think, then type. Instant replies at any hour are the clearest tell.
    await humanTyping(msg, replyText.length);

    // Send the reply — media card first if applicable, then text
    const answerObj = answer;
    if (answerObj?.mediaTag) {
      try {
        const ext = answerObj.mediaType === "video" ? "mp4" : "png";
        const mediaUrl = `${MEDIA_BASE}/cards/${answerObj.mediaTag}.${ext}`;
        // For videos, include the nextNudge as caption on the video itself
        const caption = answerObj.mediaCaption || answerObj.nextNudge || "";
        if (answerObj.mediaType === "video") {
          await msg.reply(mediaUrl, { caption });
        } else {
          await msg.reply(mediaUrl);
        }
        // Brief pause between media and text, like a human sends a photo then types
        await sleep(800 + Math.random() * 1500);
      } catch (e) {
        console.error(
          "[wa] media send failed, continuing with text:",
          (e as any)?.message,
        );
      }
    }
    await msg.reply(replyText);
    noteReply(key);
    console.log(`[wa] -> +${phone} (${source})`);
  } catch (err: any) {
    console.error("[wa] handler error:", err?.message);
  }
});

// ── outbound campaign state ─────────────────────────────────────────────────
let campaignActive = false;
let campaignSent = 0;
let campaignTotal = 0;

// Re-engagement messages — varied, human, never identical to each other
const REENGAGE_MESSAGES = [
  "Hey 😊 pending hai aapka — kab free ho to baat karte hain?",
  "Sister aapka setup reh gaya tha, main help kar deti hoon agar abhi bhi interested ho?",
  "Hi! Aapka process incomplete tha — ready ho to continue karein?",
  "Hey, missed you 😊 abhi bhi soch rahi ho to ek baar baat kar lete hain?",
  "Sister aapka step reh gaya tha — baaki sab set hai, bas ek chhota sa kaam baaki hai",
  "Hi! Long time — agar abhi bhi karna chahti ho to main hoon guide karne ke liye 🙂",
  "Aapka application pending hai — koi dikkat aayi thi kya? Batao to help karoon",
];

/**
 * Outbound re-engagement campaign. Sends messages to lost leads with human
 * timing. Rate-limited to max 4 per run with 30-60s gaps (cold outbound is
 * the #1 ban signal — we go slow).
 */
async function runCampaign(phones: string[], overrideMessage?: string) {
  campaignActive = true;
  campaignSent = 0;
  campaignTotal = phones.length;
  console.log(`[wa] campaign started — ${phones.length} leads`);

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i].replace(/[^\d]/g, "");
    const msg =
      overrideMessage || REENGAGE_MESSAGES[i % REENGAGE_MESSAGES.length];

    try {
      // Human delay between cold messages (30-60s)
      if (i > 0) await sleep(30_000 + Math.random() * 30_000);

      // Simulate typing before sending
      await sleep(2000 + Math.random() * 4000);

      const chat = await client.getNumberId(phone);
      if (!chat) {
        console.log(`[wa] campaign: +${phone} not on WhatsApp, skipping`);
        continue;
      }
      await client.sendMessage(chat, msg);
      campaignSent++;
      console.log(
        `[wa] campaign -> +${phone} (${campaignSent}/${campaignTotal})`,
      );
      await tg(`📤 Campaign -> +${phone} (${campaignSent}/${campaignTotal})`);
    } catch (e: any) {
      console.error(`[wa] campaign failed +${phone}:`, e?.message);
      // If rate-limited by WhatsApp, stop the campaign
      if (e?.message?.includes("rate") || e?.message?.includes("limit")) {
        console.log("[wa] campaign rate-limited — stopping");
        await tg(
          `⛔ Campaign STOPPED — WhatsApp rate limit hit at ${campaignSent}/${campaignTotal}`,
        );
        break;
      }
    }
  }

  campaignActive = false;
  console.log(`[wa] campaign done — sent ${campaignSent}/${campaignTotal}`);
  await tg(`✅ Campaign complete: ${campaignSent}/${campaignTotal} sent`);
}

/**
 * Broadcast a message to multiple hosts. Slower than campaign (2-5s between
 * sends) since these are existing contacts, not cold outreach.
 */
async function runBroadcast(phones: string[], message: string) {
  console.log(`[wa] broadcast started — ${phones.length} hosts`);
  let sent = 0;

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i].replace(/[^\d]/g, "");
    try {
      // Human delay between sends (2-5s)
      if (i > 0) await sleep(2000 + Math.random() * 3000);

      const chat = await client.getNumberId(phone);
      if (!chat) {
        console.log(`[wa] broadcast: +${phone} not on WhatsApp, skipping`);
        continue;
      }
      await client.sendMessage(chat, message);
      sent++;
      console.log(`[wa] broadcast -> +${phone} (${sent}/${phones.length})`);
    } catch (e: any) {
      console.error(`[wa] broadcast failed +${phone}:`, e?.message);
      if (e?.message?.includes("rate") || e?.message?.includes("limit")) {
        console.log("[wa] broadcast rate-limited — stopping");
        await tg(
          `⛔ Broadcast STOPPED — WhatsApp rate limit at ${sent}/${phones.length}`,
        );
        break;
      }
    }
  }

  console.log(`[wa] broadcast done — sent ${sent}/${phones.length}`);
  await tg(`📢 Broadcast complete: ${sent}/${phones.length} sent`);
}

// ── tiny HTTP server, purely to hand Barbie the QR ─────────────────────────
//
// The QR is a live credential: anyone who scans it links a device to her
// WhatsApp. So it is served ONLY with the correct secret, and only while a QR
// is actually pending. No secret configured -> the route refuses to serve.
const QR_SECRET = process.env.WA_QR_SECRET || "";
const PORT = Number(process.env.PORT || 8080);

const http = await import("node:http");
http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    const keyOk = QR_SECRET && url.searchParams.get("k") === QR_SECRET;

    // Raw current QR image. Polled by the page below so the code on screen is
    // always the live one — WhatsApp rotates it roughly every 20 seconds, and a
    // full page reload each time made it impossible to actually finish scanning.
    if (url.pathname === "/qr.png") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      if (!currentQrPng) {
        res.writeHead(404);
        return res.end("no qr");
      }
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      });
      return res.end(currentQrPng);
    }

    if (url.pathname === "/qr.json") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      return res.end(
        JSON.stringify({
          hasQr: !!currentQrPng,
          ageMs: currentQrPng ? Date.now() - currentQrAt : null,
          linked: !!client.info?.wid?.user,
          number: client.info?.wid?.user ?? null,
          ready: isReady,
          messagesSeen,
          paused: botPaused,
        }),
      );
    }

    // ── pause/resume toggle ──
    if (url.pathname === "/pause") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      const action = url.searchParams.get("action");
      if (action === "pause") {
        botPaused = true;
        console.log("[wa] bot PAUSED via HTTP");
        await tg("⏸ WhatsApp bot PAUSED via admin");
      } else if (action === "resume") {
        botPaused = false;
        console.log("[wa] bot RESUMED via HTTP");
        await tg("▶️ WhatsApp bot RESUMED via admin");
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ paused: botPaused }));
    }

    // ── outbound campaign: send re-engagement to lost leads ──
    // POST body: { phones: ["919876543210", ...], message: "optional override" }
    // GET: returns campaign status
    if (url.pathname === "/campaign") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }

      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            active: campaignActive,
            sent: campaignSent,
            total: campaignTotal,
          }),
        );
      }

      if (req.method === "POST") {
        if (campaignActive) {
          res.writeHead(409, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "campaign already running" }));
        }
        let body = "";
        for await (const chunk of req) body += chunk;
        try {
          const data = JSON.parse(body);
          const phones: string[] = data.phones || [];
          if (!phones.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "no phones provided" }));
          }
          // Start campaign in background
          runCampaign(phones, data.message).catch((e) =>
            console.error("[wa] campaign error:", e),
          );
          res.writeHead(202, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ accepted: true, total: phones.length }),
          );
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "invalid json" }));
        }
      }
    }

    // ── broadcast: send a message to multiple hosts ──
    // POST body: { phones: ["919876543210", ...], message: "hello" }
    if (url.pathname === "/broadcast") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        return res.end("method not allowed");
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const data = JSON.parse(body);
        const phones: string[] = data.phones || [];
        const message: string = data.message || "";
        if (!phones.length || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "phones and message required" }),
          );
        }
        // Send in background
        runBroadcast(phones, message).catch((e) =>
          console.error("[wa] broadcast error:", e),
        );
        res.writeHead(202, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ accepted: true, total: phones.length }),
        );
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "invalid json" }));
      }
    }

    if (url.pathname === "/qr") {
      if (!keyOk) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        return res.end("forbidden");
      }
      // The image is swapped in place every 3s; the page itself never reloads.
      // Barbie can leave this open as long as she likes and always be looking at
      // a currently-valid code.
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Link WhatsApp</title>
<body style="font-family:system-ui,sans-serif;background:#0b0b0f;color:#eee;text-align:center;margin:0;padding:24px">
<h2 style="color:#ff3b8b;margin:8px 0">Link WhatsApp</h2>
<p style="color:#bbb;margin:0 0 16px">Settings → Linked devices → Link a device</p>
<div id="box" style="background:#fff;display:inline-block;padding:12px;border-radius:12px;min-height:300px;min-width:300px">
  <img id="qr" width="300" height="300" alt="QR">
</div>
<p id="status" style="color:#888;font-size:14px">Loading…</p>
<script>
const k = new URLSearchParams(location.search).get('k');
async function tick(){
  try{
    const s = await (await fetch('/qr.json?k='+k,{cache:'no-store'})).json();
    if (s.linked){
      document.getElementById('box').style.display='none';
      document.getElementById('status').innerHTML =
        '<b style="color:#25D366;font-size:18px">✅ Linked to +' + s.number + '</b><br>' +
        '<span style="color:#bbb">Check this is your business number.</span>';
      return; // stop polling
    }
    if (s.hasQr){
      document.getElementById('qr').src = '/qr.png?k='+k+'&t='+Date.now();
      document.getElementById('status').textContent =
        'Code refreshes automatically — take your time.';
    } else {
      document.getElementById('status').textContent = 'Waiting for a code…';
    }
  }catch(e){
    document.getElementById('status').textContent = 'Reconnecting…';
  }
  setTimeout(tick, 3000);
}
tick();
</script>
</body>`);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        linked: !!client.info?.wid?.user,
        qrPending: !!currentQrPng,
      }),
    );
  })
  .listen(PORT, () =>
    console.log(`[wa] http listening on ${PORT} — QR at /qr?k=...`),
  );

console.log("[wa] starting — session dir:", SESSION_DIR);
client.initialize().catch(async (err) => {
  console.error("[wa] failed to start:", err);
  await tg(`❌ WhatsApp bot failed to start: ${err?.message}`);
  process.exit(1);
});

async function shutdown() {
  console.log("[wa] shutting down");
  persistSeen();
  saveJson(OPTOUT_FILE, [...optOuts]);
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
