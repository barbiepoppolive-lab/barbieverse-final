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
  isReady = true;
  const me = client.info?.wid?.user;
  console.log("[wa] connected as", me);
  // Barbie must SEE which number linked. The whole disaster earlier today was
  // a message that sent successfully from the wrong number.
  await tg(`✅ <b>WhatsApp bot connected</b>\nLinked number: <b>+${me}</b>\n\nMode: ${APPROVE_MODE}\nCaps: ${MAX_REPLIES_PER_HOUR}/hour, ${MAX_REPLIES_PER_CONTACT_PER_DAY}/contact/day\n\nIf this is NOT your business number, stop the service now.`);
});

client.on("authenticated", () => console.log("[wa] authenticated, session saved to", SESSION_DIR));

// Visibility into the gap between `authenticated` and `ready`. That gap is
// where this silently died: linked, logs clean, no messages ever handled.
client.on("loading_screen", (percent, message) =>
  console.log(`[wa] loading ${percent}% ${message || ""}`));
client.on("change_state", (state) => console.log("[wa] state:", state));
client.on("auth_failure", async (m) => { console.error("[wa] auth failure", m); await tg(`❌ WhatsApp auth failed: ${m}`); });
client.on("disconnected", async (r) => { console.log("[wa] disconnected:", r); await tg(`⚠️ WhatsApp bot disconnected: ${r}`); });

client.on("message", async (msg: any) => {
  try {
    messagesSeen++;
    if (msg.fromMe || msg.isStatus) return;

    // Groups, broadcasts and status. Auto-replying in a group is the single
    // most visible "this is a bot" signal there is, and it annoys people who
    // never asked us anything.
    const from: string = msg.from || "";
    if (from.endsWith("@g.us") || from.includes("broadcast") || from.includes("status")) return;

    if (msg.id?._serialized && seenIds.has(msg.id._serialized)) return;
    if (msg.id?._serialized) { seenIds.add(msg.id._serialized); persistSeen(); }

    // WhatsApp now addresses individuals by LID (…@lid), not phone number, so
    // stripping "@c.us" leaves an unusable id like 234002787123445@lid. That is
    // fine as a map key but useless in an alert — Barbie cannot act on an
    // escalation she cannot identify. Resolve to the real number where we can,
    // and keep the raw id as the stable key.
    const key = from.replace(/@(c\.us|lid)$/, "");
    let phone = key;
    try {
      const contact = await msg.getContact();
      const resolved = contact?.number || contact?.id?.user;
      if (resolved && /^\d{8,15}$/.test(String(resolved))) phone = String(resolved);
    } catch { /* keep the key */ }

    if (optOuts.has(key)) return; // permanent, no exceptions

    const text = (msg.body || "").trim();

    // Media with no caption: acknowledge, tell Barbie, do not improvise.
    if (msg.hasMedia && !text) {
      await tg(`📷 <b>Screenshot from +${phone}</b>\nCheck it and reply yourself.`);
      if (hourlyBudgetLeft() && contactBudgetLeft(key)) {
        await sleep(thinkTime(40));
        await msg.reply("Screenshot mil gya sister 👍 main abhi dekh ke batati hoon");
        noteReply(key);
      }
      return;
    }
    if (!text) return;

    console.log(`[wa] <- +${phone}: ${text.slice(0, 80)}`);

    // Opt-out is checked BEFORE anything else can generate a reply.
    if (OPT_OUT.test(text)) {
      optOuts.add(key);
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
    if (!contactBudgetLeft(key)) {
      await tg(`⏸ +${phone} hit the per-contact daily cap. Reply by hand if needed.`);
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
    noteReply(key);
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

  const keyOk = QR_SECRET && url.searchParams.get("k") === QR_SECRET;

  // Raw current QR image. Polled by the page below so the code on screen is
  // always the live one — WhatsApp rotates it roughly every 20 seconds, and a
  // full page reload each time made it impossible to actually finish scanning.
  if (url.pathname === "/qr.png") {
    if (!keyOk) { res.writeHead(403); return res.end("forbidden"); }
    if (!currentQrPng) { res.writeHead(404); return res.end("no qr"); }
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
    return res.end(currentQrPng);
  }

  if (url.pathname === "/qr.json") {
    if (!keyOk) { res.writeHead(403); return res.end("forbidden"); }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({
      hasQr: !!currentQrPng,
      ageMs: currentQrPng ? Date.now() - currentQrAt : null,
      linked: !!client.info?.wid?.user,
      number: client.info?.wid?.user ?? null,
      ready: isReady,
      messagesSeen,
    }));
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
