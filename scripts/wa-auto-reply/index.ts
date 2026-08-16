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
import { matchAnswer, needsEscalation, complianceCheck, ANSWERS } from "./answer-bank";

if (!process.env.RAILWAY_PROJECT_ID) {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env") });
  } catch {}
}

// ── configuration ──────────────────────────────────────────────────────────
const APPROVE_MODE = (process.env.WA_APPROVE_MODE || "canned-auto") as
  | "all-manual" | "canned-auto" | "all-auto";

// Session lives on a Railway volume. Without this the container's disk is wiped
// on every deploy and WhatsApp demands a fresh QR scan each time.
const SESSION_DIR = process.env.WA_SESSION_DIR || "/data/wwebjs_auth";

const MAX_REPLIES_PER_HOUR = Number(process.env.WA_MAX_REPLIES_PER_HOUR || 25);
const MAX_REPLIES_PER_CONTACT_PER_DAY = Number(process.env.WA_MAX_PER_CONTACT_DAY || 8);
const MIN_DELAY_MS = Number(process.env.WA_MIN_DELAY_MS || 6_000);
const MAX_DELAY_MS = Number(process.env.WA_MAX_DELAY_MS || 22_000);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const OPTOUT_FILE = path.join(SESSION_DIR, "optouts.json");
const SEEN_FILE = path.join(SESSION_DIR, "seen.json");

fs.mkdirSync(SESSION_DIR, { recursive: true });

// ── persistence (survives restarts via the volume) ─────────────────────────
function loadJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function saveJson(file: string, data: unknown) {
  try { fs.writeFileSync(file, JSON.stringify(data)); } catch (e) {
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
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: "HTML" }),
    });
  } catch (e) { console.error("[wa] telegram failed", e); }
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
    form.append("photo", new Blob([pngBuffer], { type: "image/png" }), "qr.png");
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: "POST", body: form,
    });
    const body = await res.text();
    if (!res.ok) console.error(`[wa] telegram sendPhoto ${res.status}: ${body.slice(0, 300)}`);
    else console.log("[wa] QR delivered to Telegram");
  } catch (e) { console.error("[wa] telegram photo threw:", e); }
}

// ── LLM long-tail (optional) ───────────────────────────────────────────────
async function writeReply(text: string, topicsAsked: string[] = []): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const seen = new Set(topicsAsked);
  const facts = ANSWERS.filter((a) => !seen.has(a.id)).map((a) => `${a.id}: ${a.reply}`).join("\n\n");

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${text}` }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      },
    );
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) return null;
    return complianceCheck(reply).ok ? reply : null;
  } catch { return null; }
}

// ── rate limiting ──────────────────────────────────────────────────────────
function hourlyBudgetLeft(): boolean {
  const h = new Date().getUTCHours();
  if (h !== hourStamp) { hourStamp = h; repliesThisHour = 0; }
  return repliesThisHour < MAX_REPLIES_PER_HOUR;
}

function contactBudgetLeft(phone: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const rec = contactCounts.get(phone);
  if (!rec || rec.day !== today) { contactCounts.set(phone, { day: today, n: 0 }); return true; }
  return rec.n < MAX_REPLIES_PER_CONTACT_PER_DAY;
}

function noteReply(phone: string) {
  repliesThisHour++;
  const today = new Date().toISOString().slice(0, 10);
  const rec = contactCounts.get(phone);
  contactCounts.set(phone, rec && rec.day === today ? { day: today, n: rec.n + 1 } : { day: today, n: 1 });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Longer messages take longer to type. Roughly human. */
function thinkTime(replyLength: number) {
  const base = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return Math.round(base + Math.min(replyLength * 25, 12_000));
}

const OPT_OUT = /\b(stop|unsubscribe|band karo|mat bhejo|message mat|block|don'?t message|do not message|nahi chahiye|not interested)\b/i;

// ── client ─────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    // Must come from env. A hardcoded Windows path made this unrunnable
    // anywhere but one laptop, while the README promised Railway deploys.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
      "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process",
    ],
  },
  authTimeoutMs: 180_000,
});

// Latest QR, held in memory and served over HTTP as a fallback. Telegram
// delivery has proven unreliable and a QR nobody can see is a dead bot.
let currentQrPng: Buffer | null = null;
let currentQrAt = 0;

client.on("qr", async (qr) => {
  try {
    currentQrPng = await QRCode.toBuffer(qr, { width: 512, margin: 2 });
    currentQrAt = Date.now();
    console.log(`[wa] QR ready — open /qr?k=... to scan (also attempting Telegram)`);
    await tgPhoto(
      currentQrPng,
      "📱 Scan within 60 seconds:\nWhatsApp → Settings → Linked devices → Link a device",
    );
  } catch (e) {
    console.error("[wa] QR render failed", e);
  }
});

client.on("ready", async () => {
  const me = client.info?.wid?.user;
  console.log("[wa] connected as", me);
  // Barbie must SEE which number linked. The whole disaster earlier today was
  // a message that sent successfully from the wrong number.
  await tg(`✅ <b>WhatsApp bot connected</b>\nLinked number: <b>+${me}</b>\n\nMode: ${APPROVE_MODE}\nCaps: ${MAX_REPLIES_PER_HOUR}/hour, ${MAX_REPLIES_PER_CONTACT_PER_DAY}/contact/day\n\nIf this is NOT your business number, stop the service now.`);
});

client.on("authenticated", () => console.log("[wa] authenticated, session saved to", SESSION_DIR));
client.on("auth_failure", async (m) => { console.error("[wa] auth failure", m); await tg(`❌ WhatsApp auth failed: ${m}`); });
client.on("disconnected", async (r) => { console.log("[wa] disconnected:", r); await tg(`⚠️ WhatsApp bot disconnected: ${r}`); });

client.on("message", async (msg: any) => {
  try {
    if (msg.fromMe || msg.isStatus) return;

    // Groups, broadcasts and status. Auto-replying in a group is the single
    // most visible "this is a bot" signal there is, and it annoys people who
    // never asked us anything.
    const from: string = msg.from || "";
    if (from.endsWith("@g.us") || from.includes("broadcast") || from.includes("status")) return;

    if (msg.id?._serialized && seenIds.has(msg.id._serialized)) return;
    if (msg.id?._serialized) { seenIds.add(msg.id._serialized); persistSeen(); }

    const phone = from.replace(/@c\.us$/, "");
    if (optOuts.has(phone)) return; // permanent, no exceptions

    const text = (msg.body || "").trim();

    // Media with no caption: acknowledge, tell Barbie, do not improvise.
    if (msg.hasMedia && !text) {
      await tg(`📷 <b>Screenshot from +${phone}</b>\nCheck it and reply yourself.`);
      if (hourlyBudgetLeft() && contactBudgetLeft(phone)) {
        await sleep(thinkTime(40));
        await msg.reply("Screenshot mil gya sister 👍 main abhi dekh ke batati hoon");
        noteReply(phone);
      }
      return;
    }
    if (!text) return;

    console.log(`[wa] <- +${phone}: ${text.slice(0, 80)}`);

    // Opt-out is checked BEFORE anything else can generate a reply.
    if (OPT_OUT.test(text)) {
      optOuts.add(phone);
      saveJson(OPTOUT_FILE, [...optOuts]);
      await tg(`🚫 <b>+${phone} opted out</b> — added to permanent do-not-reply.\n"${text.slice(0, 150)}"`);
      return;
    }

    const escalation = needsEscalation(text);
    if (escalation) {
      // Stay silent. Barbie answers money, refunds, anger and anything about a
      // minor herself — an automated reply to those is how real damage happens.
      await tg(`🚨 <b>Escalation — ${escalation}</b>\n+${phone}\n\n"${text.slice(0, 300)}"\n\nBot stayed silent. This one is yours.`);
      return;
    }

    if (!hourlyBudgetLeft()) {
      console.log("[wa] hourly cap reached — staying quiet");
      return;
    }
    if (!contactBudgetLeft(phone)) {
      await tg(`⏸ +${phone} hit the per-contact daily cap. Reply by hand if needed.`);
      return;
    }

    const answer = matchAnswer(text);
    const topics = leadTopics.get(phone) || [];
    if (answer && !topics.includes(answer.id)) {
      topics.push(answer.id);
      leadTopics.set(phone, topics);
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
      await tg(`❓ <b>+${phone}</b> — no canned answer matched.\n"${text.slice(0, 200)}"\n\nReply by hand.`);
      return;
    }

    const gate = complianceCheck(replyText);
    if (!gate.ok) {
      await tg(`⛔ Blocked reply to +${phone}: ${gate.issues.join("; ")}`);
      return;
    }

    // Think, then type. Instant replies at any hour are the clearest tell.
    await sleep(thinkTime(replyText.length));
    try { await (await msg.getChat()).sendStateTyping(); } catch {}
    await sleep(1500 + Math.random() * 2500);

    await msg.reply(replyText);
    noteReply(phone);
    console.log(`[wa] -> +${phone} (${source})`);
  } catch (err: any) {
    console.error("[wa] handler error:", err?.message);
  }
});

// ── tiny HTTP server, purely to hand Barbie the QR ─────────────────────────
//
// The QR is a live credential: anyone who scans it links a device to her
// WhatsApp. So it is served ONLY with the correct secret, and only while a QR
// is actually pending. No secret configured -> the route refuses to serve.
const QR_SECRET = process.env.WA_QR_SECRET || "";
const PORT = Number(process.env.PORT || 8080);

const http = await import("node:http");
http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname === "/qr") {
    if (!QR_SECRET || url.searchParams.get("k") !== QR_SECRET) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      return res.end("forbidden");
    }
    if (!currentQrPng || Date.now() - currentQrAt > 90_000) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(
        "<meta http-equiv=refresh content=5><body style='font-family:sans-serif;text-align:center;padding-top:40px'>" +
        "<h3>No QR pending</h3><p>Either the bot is already linked, or a new code is being generated.</p>" +
        "<p>This page refreshes itself every 5 seconds.</p></body>",
      );
    }
    // Auto-refreshing wrapper: codes expire every ~20s, so a bare image would
    // go stale in the time it takes to open WhatsApp.
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(
      "<meta http-equiv=refresh content=15><body style='font-family:sans-serif;text-align:center;background:#111;color:#eee'>" +
      "<h3>Scan with WhatsApp</h3><p>Settings &rarr; Linked devices &rarr; Link a device</p>" +
      `<img src="data:image/png;base64,${currentQrPng.toString("base64")}" width="320">` +
      "<p style='color:#888;font-size:13px'>Refreshes every 15s. Keep this page open.</p></body>",
    );
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, linked: !!client.info?.wid?.user, qrPending: !!currentQrPng }));
}).listen(PORT, () => console.log(`[wa] http listening on ${PORT} — QR at /qr?k=...`));

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
  try { await client.destroy(); } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
