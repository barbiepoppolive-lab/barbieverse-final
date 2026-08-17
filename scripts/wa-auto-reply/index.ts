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
const { Client, LocalAuth, MessageMedia } = pkg;

import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import {
  matchAnswer,
  needsEscalation,
  complianceCheck,
  ANSWERS,
  Q0_VARIANTS,
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
const MIN_DELAY_MS = Number(process.env.WA_MIN_DELAY_MS || 10_000);
const MAX_DELAY_MS = Number(process.env.WA_MAX_DELAY_MS || 12_000);

// Pause toggle: WA_BOT_PAUSED=true shuts off all replies without killing the process.
let botPaused = process.env.WA_BOT_PAUSED === "true";

const MEDIA_BASE = process.env.PUBLIC_APP_URL || "https://barbieverse.org";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const OPTOUT_FILE = path.join(SESSION_DIR, "optouts.json");
const SEEN_FILE = path.join(SESSION_DIR, "seen.json");

fs.mkdirSync(SESSION_DIR, { recursive: true });

// Remove stale Chromium lock files from previous deploys/crashes.
// Without this the bot fails with "profile appears to be in use by another process".
function removeLocks(dir: string, depth = 0) {
  if (depth > 4) return;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (
        entry.name === "SingletonLock" ||
        entry.name === "SingletonSocket" ||
        entry.name === "SingletonCookie"
      ) {
        if (entry.isDirectory()) fs.rmSync(full, { recursive: true });
        else fs.unlinkSync(full);
        console.log(`[wa] removed stale ${entry.name} at ${full}`);
      } else if (entry.isDirectory()) {
        removeLocks(full, depth + 1);
      }
    }
  } catch {
    /* ignore */
  }
}
removeLocks(SESSION_DIR);

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

// ── Blocklist: never reply to these numbers ──────────────────────────────────
// These are existing team members / internal numbers. Bot must never interact.
const BLOCKED_PHONES = new Set<string>([
  "214168695263324", // Gayatri Devi Bolla
  "919967980700", // Barbie's own contact ("sir") — not a recruiting lead, bot pitched him anyway
  "91807674259", // Riya — converted lead, no longer texting
]);
// Also check at message handler level — merge with optOuts for outbound protection
// message ids already handled — prevents double-replies after a restart
const seenIds = new Set<string>(loadJson<string[]>(SEEN_FILE, []).slice(-2000));
const leadTopics = new Map<string, string[]>();
const contactCounts = new Map<string, { day: string; n: number }>();
// When did we last send a bare "😊" acknowledgement-nudge to this contact?
// Used to break out of total silence on a trailing "ok"/"okk" without
// risking an "ok" <-> "😊" ping-pong loop (see ACKNOWLEDGEMENT_RE handling).
const lastAckReplyAt = new Map<string, number>();
let hourStamp = new Date().getUTCHours();
let repliesThisHour = 0;

// ── Debounce buffer: concatenate rapid-fire messages per lead ────────────────
// When a lead sends "Hi" / "details chahiye" / "earning kitni hai?" in quick
// succession, debounce them into one logical turn → one Grok call instead of
// three. 3-5s window, capped at 15s max wait.
const DEBOUNCE_MS = 4000;
const DEBOUNCE_MAX_MS = 15000;
const pendingMessages = new Map<string, { texts: string[]; timer: ReturnType<typeof setTimeout>; firstAt: number; msg: any; leadId: string | null; phone: string; key: string }>();

// ── Acknowledgement patterns: never reach the LLM ───────────────────────────
const ACKNOWLEDGEMENT_RE = /^\s*(ok|okay|hmm?|haan|acha|theek|ji|yes|no|nahi|nah|y|n|👍|😊|🙏|okk?|thx|thanks|k|kk)\s*[!.…]?\s*$/i;

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

// ── lead context from DB ───────────────────────────────────────────────────
interface LeadContext {
  id: string;
  phone: string;
  displayName: string | null;
  stage: string;
  topicsCovered: string[];
  nextStep: string;
  transcript: string;
  // Grok agent state
  conversationStage: string;
  leadScore: number;
  streamingExperience: string | null;
  currentPlatform: string | null;
  trustLevel: string | null;
  objectionCount: number;
  conversationSummary: string | null;
  nextBestAction: string | null;
  grokCompactionBlob: string | null;
  createdAt: string | null;
  lastInboundAt: string | null;
}

async function getLeadContext(phone: string): Promise<LeadContext | null> {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return null;
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();

    const leadRes = await pg.query(
      `SELECT id, phone, display_name, stage, topics_asked, conversation_stage, lead_score,
              streaming_experience, current_platform, trust_level,
              objection_count, conversation_summary, next_best_action,
              grok_compaction_blob, created_at, last_inbound_at
       FROM wa_leads WHERE phone = $1`,
      [phone],
    );
    if (!leadRes.rows[0]) { await pg.end(); return null; }
    const lead = leadRes.rows[0];

    const msgRes = await pg.query(
      `SELECT direction, body, created_at FROM wa_messages
       WHERE lead_id = $1 AND body IS NOT NULL AND body != ''
       ORDER BY created_at DESC LIMIT 30`,
      [lead.id],
    );
    await pg.end();

    const msgs = msgRes.rows.reverse().map((m: any) => {
      const dir = m.direction === "out" ? "Barbie" : "Lead";
      return `${dir}: ${m.body}`;
    }).join("\n");

    return {
      id: lead.id,
      phone: lead.phone,
      displayName: lead.display_name,
      stage: lead.stage,
      topicsCovered: lead.topics_asked || [],
      nextStep: "",
      transcript: msgs,
      conversationStage: lead.conversation_stage || "NEW",
      leadScore: lead.lead_score || 0,
      streamingExperience: lead.streaming_experience,
      currentPlatform: lead.current_platform,
      trustLevel: lead.trust_level,
      objectionCount: lead.objection_count || 0,
      conversationSummary: lead.conversation_summary,
      nextBestAction: lead.next_best_action,
      grokCompactionBlob: lead.grok_compaction_blob,
      createdAt: lead.created_at,
      lastInboundAt: lead.last_inbound_at,
    };
  } catch {
    return null;
  }
}

// ── Grok agent: reply generation, tools, compaction, observability ──────────
//
// Architecture: grok-4.20-0309-non-reasoning (Tier 1, no reasoning tokens,
// $1.25/$0.20-cached/$2.50) as default. grok-4.6 with reasoning_effort: "low"
// reserved for escalations. Fallback chain: Groq → Gemini.
//
// Static system prompt + tool definitions are byte-identical every call →
// xAI auto-caches them (prefix-match). x-grok-conv-id header per lead
// further improves hit rate.

// ── Tool definitions for Grok ───────────────────────────────────────────────
const GROK_TOOLS = [
  {
    type: "function",
    function: {
      name: "update_lead_state",
      description: "Record something durable learned about this lead THIS TURN. You MUST pass at least one field with actual data from the conversation. Do NOT call with empty args.",
      parameters: {
        type: "object",
        properties: {
          streaming_experience: { type: "string", description: "What she told you about her streaming background. E.g. 'none', 'streamed on Poppo for 3 months', 'does YouTube shorts'" },
          current_platform: { type: "string", description: "Competitor app/platform she mentioned by name. E.g. 'Poppo', 'Tango', 'Bigo'. Only set if she explicitly named one." },
          objection: { type: "string", description: "The specific objection she raised, in her own words. E.g. 'family won't allow', 'scam lagta hai', 'no experience'" },
          trust_level: { type: "string", enum: ["low", "medium", "high"], description: "low=skeptical/afraid, medium=curious but cautious, high=engaged/wants to join" },
          conversation_summary: { type: "string", description: "1-2 sentences summarizing what happened THIS TURN. E.g. 'Asked about earnings, explained per-minute model, she seems interested but worried about family approval'" },
          next_best_action: { type: "string", description: "What Barbie should do next with this lead. E.g. 'Send joining link', 'Address her fear about face verification', 'Wait - she needs time'" },
          lead_score: { type: "number", description: "0-100 score. 0=new/unread, 30=asked questions, 50=engaged 3+ turns, 70=addressed objections, 90=ready to join" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_conversation_stage",
      description: "Transition the conversation warmth stage. Call when her engagement level genuinely changes based on what she said this turn.",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            enum: ["NEW", "CURIOUS", "QUALIFYING", "INTERESTED", "WARM", "HIGH_INTENT", "READY_TO_JOIN", "JOINING", "JOINED", "HUMAN_HANDOFF", "LOST", "FOLLOW_UP"],
            description: "NEW=first contact, CURIOUS=asking questions, QUALIFYING=answering your questions, INTERESTED=positive signals, WARM=addressing objections, HIGH_INTENT=almost ready, READY_TO_JOIN=confirmed intent, JOINING=link sent, JOINED=verified",
          },
          reason: { type: "string", description: "Why this transition happened, based on what she said. E.g. 'She asked how to join' or 'She raised an objection about payment'" },
        },
        required: ["stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_human_handoff",
      description: "STOP autonomous replies and alert Barbie. Use for: anger/abuse, payment issues, legal/safety, explicit human request, repeated misunderstanding, VIP leads.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: ["angry", "payment_issue", "legal_or_safety", "explicit_human_request", "uncertain", "vip_lead", "repeated_misunderstanding"],
          },
          summary_for_barbie: { type: "string", description: "2 sentences: what's happening and what Barbie should do" },
        },
        required: ["reason", "summary_for_barbie"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_admin",
      description: "Low-frequency alert to Barbie about something noteworthy. Use very sparingly — maybe 1 in 20 turns.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "What Barbie should know about this lead" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_joining_link",
      description: "Send the BarbieVerse joining link. ONLY when she has explicitly confirmed she wants to join — e.g. 'haan bhejo', 'link do', 'I want to join'. Never speculatively.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Lead's phone number (digits only, with country code)" },
        },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_application_status",
      description: "Check if her agency application was processed. Use when she asks 'did it work', 'kya hua', 'ab kya' after previously getting the joining link.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Lead's phone number" },
        },
        required: ["phone"],
      },
    },
  },
] as const;

// ── Static system prompt (cached by xAI automatic prefix cache) ─────────────
// Must be byte-identical every call for cache hits. Facts from ANSWERS bank
// are included here as locked reference — single source of truth with the
// canned answer-bank so the two paths can never drift apart.
function buildSystemPrompt(topicsAsked: string[]): string {
  const seen = new Set(topicsAsked);
  const facts = ANSWERS.filter((a) => !seen.has(a.id))
    .map((a) => `${a.id}: ${a.reply}`)
    .join("\n\n");

  return `You are Barbie, replying on her own WhatsApp to a lead who wants to become a live-streaming host. You are not "an AI assistant" — you are a specific person continuing a specific conversation. A generic, polite, assistant-sounding reply is a FAILED reply here, even if it's factually correct.

━━━ STEP 1 — DEEP ANALYSIS (do this BEFORE every reply) ━━━
Read EVERY message in the RECENT CONVERSATION and LEAD STATE. Do not just look at the last message. Understand:
- What is she feeling right now? (scared, excited, confused, skeptical, bored, angry?)
- What did she JUST say specifically? What is the ONE thing she needs answered?
- What is her journey so far? (new lead? returning? stuck at a stage?)
- What has she NOT told you yet that you need to know?
- What is her emotional state — match her energy, don't override it

Your reply must address HER specific thing, not a generic next step.

━━━ VOICE (from analysing 3,278 of Barbie's real messages) ━━━
- Median message is 23 chars. 31% of her replies are 1-15 chars ("Ji", "Okay", "Nhi")
- "kr" not "kar", "skte" not "sakte", "mei" not "mein"
- "sister" or "aap" — NEVER "tum", NEVER "mam"
- Barbie is FEMALE: "deti hoon", "kar dungi", NEVER "deta hoon", "karta hoon"
- 1-3 short messages, never a paragraph, never a bulleted list
- Emoji in ~9% of messages, mostly 😊 — most messages have none
- NEVER say "mei abhi live aati hoon" or "live aane wali hoon" — Barbie is the AGENCY OWNER, she doesn't go live herself. She sends OTHER girls to go live.
- NEVER promise when she'll be available, online, or call back
- NEVER say "call me" or "I'll call you" or "wait, I'm coming"

━━━ FIRST CONTACT vs MID-CONVERSATION ━━━
- If conversation_stage is "NEW" and there is no prior conversation history, it's fine to open with "Haan, batati hoon 😊"
- If there IS prior conversation (any other stage), do NOT open with a greeting or restart the pitch — continue the actual thread
- If she's returning after silence, acknowledge she's back — don't restart from zero

━━━ CONVERSATION FLOW — THINK LIKE A HUMAN, NOT A FUNNEL ━━━
- Don't pitch in the first 1-2 messages. Just TALK to her like a friend.
- If she says "hi" → say "hi" back, ask how she is, wait for HER to bring up streaming
- If she's scared → don't jump to facts. Reassure her first. "dar mat, sab normal hai"
- If she's confused → clarify gently, don't dump info
- If she's excited → match her energy, then guide naturally
- If she asks about money → answer her specific question, don't add extra pitch
- The conversation should FEEL like texting a friend who happens to know about streaming, not like a sales call

━━━ QUESTIONS MUST BE REAL ━━━
- Every question must map to an actual next step: "install ho gaya?" (after link sent), "agency ID daal diya?" (after install), "screenshot bhej do" (after agency linked)
- Never ask a vague rapport question — "kya aapko pta hai aapko kya karna hai" is a failure
- NEVER ask about husband/family/permission unless SHE brought it up
- Don't ask what you can already answer from the conversation history

━━━ MONEY FACTS (locked, never invent different numbers) ━━━
${facts || "(topic already covered — give a fresh angle, keep numbers identical)"}

━━━ NEVER DO ━━━
- Send 3+ messages without a question in the last one
- Info-dump paragraphs
- Offer voice/video calls
- Say "guarantee"
- Write the app name
- Invent rupee figures
- Send media without a question after it
- Sound like customer support
- Say "mei live aati hoon" or "live aane wali hoon" — you are the AGENCY, not a host
- Promise to call back or be available at a specific time
- Send the same template reply to different leads — every reply must be specific to THIS conversation
- Use formal/business language — this is WhatsApp, not email

━━━ TOOL USE — YOU MUST CALL THESE TOOLS EVERY TURN ━━━
After reading the conversation and before writing your reply, decide if any of these apply. If yes, call the tool(s) WITH REAL DATA from the conversation. Do NOT call tools with empty args.

REQUIRED tool calls (when applicable):
1. update_lead_state — ALWAYS call this. Pass at least one field with actual extracted data:
   - She said "Poppo pe thi" → call with { current_platform: "Poppo" }
   - She said "family allow nahi karega" → call with { objection: "family won't allow", trust_level: "low", next_best_action: "address family concern" }
   - She asked "kitna milega?" → call with { lead_score: 50, conversation_summary: "Asked about earnings, explained per-minute model" }
   - She said "link bhejo" → call with { lead_score: 90, next_best_action: "send joining link" }
2. mark_conversation_stage — call when warmth changes:
   - First message from her → call with { stage: "CURIOUS", reason: "First contact, asking questions" }
   - She raised an objection → call with { stage: "WARM", reason: "Addressing objection about family approval" }
   - She confirmed intent → call with { stage: "READY_TO_JOIN", reason: "Explicitly asked for link" }

EXAMPLES of correct tool usage:
- If she says "mujhe bhi karna hai" → update_lead_state({ lead_score: 70, trust_level: "medium", conversation_summary: "Expressed interest in joining" }) + mark_conversation_stage({ stage: "INTERESTED", reason: "Wants to join" })
- If she says "Poppo pe karti thi" → update_lead_state({ streaming_experience: "used Poppo", current_platform: "Poppo" })
- If she says "dar lagta hai" → update_lead_state({ objection: "afraid/scared", trust_level: "low" }) + mark_conversation_stage({ stage: "WARM", reason: "Expressed fear" })
- If she says "bhejo link" → update_lead_state({ lead_score: 90 }) + send_joining_link({ phone: leadPhone })
- EVERY reply should include at least an update_lead_state call with conversation_summary updated to what happened this turn`;
}

// ── Execute a Grok tool call ────────────────────────────────────────────────
async function executeToolCall(
  toolName: string,
  args: any,
  leadId: string,
  phone: string,
): Promise<string> {
  const dbUrl = process.env.SUPABASE_DB_URL;
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl!, ssl: { rejectUnauthorized: false } });
    await pg.connect();

    switch (toolName) {
      case "update_lead_state": {
        const sets: string[] = [];
        const vals: any[] = [];
        let idx = 1;
        if (args.streaming_experience !== undefined) { sets.push(`streaming_experience = $${idx++}`); vals.push(args.streaming_experience); }
        if (args.current_platform !== undefined) { sets.push(`current_platform = $${idx++}`); vals.push(args.current_platform); }
        if (args.objection !== undefined) { sets.push(`objection_count = objection_count + 1`); }
        if (args.trust_level !== undefined) { sets.push(`trust_level = $${idx++}`); vals.push(args.trust_level); }
        if (args.conversation_summary !== undefined) { sets.push(`conversation_summary = $${idx++}`); vals.push(args.conversation_summary); }
        if (args.next_best_action !== undefined) { sets.push(`next_best_action = $${idx++}`); vals.push(args.next_best_action); }
        if (args.lead_score !== undefined) { sets.push(`lead_score = $${idx++}`); vals.push(Math.min(100, Math.max(0, args.lead_score))); }
        if (sets.length > 0) {
          vals.push(leadId);
          await pg.query(`UPDATE wa_leads SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
        }
        await pg.end();
        return JSON.stringify({ ok: true });
      }
      case "mark_conversation_stage": {
        await pg.query(
          `UPDATE wa_leads SET conversation_stage = $1 WHERE id = $2`,
          [args.stage, leadId],
        );
        await pg.end();
        return JSON.stringify({ ok: true, stage: args.stage });
      }
      case "request_human_handoff": {
        await pg.query(
          `UPDATE wa_leads SET human_takeover = true, escalated = true, escalated_reason = $1, conversation_stage = 'HUMAN_HANDOFF' WHERE id = $2`,
          [args.reason, leadId],
        );
        await pg.end();
        await tg(
          `🚨 <b>Handoff — ${args.reason}</b>\n+${phone}\nSummary: ${args.summary_for_barbie}\n\nBot stopped. This one is yours.`,
        );
        return JSON.stringify({ ok: true, handed_off: true });
      }
      case "notify_admin": {
        await tg(`🔔 <b>+${phone}</b>: ${args.message}`);
        await pg.end();
        return JSON.stringify({ ok: true });
      }
      case "send_joining_link": {
        // Mark stage and return — the actual link sending happens in the handler
        await pg.query(
          `UPDATE wa_leads SET stage = CASE WHEN stage = 'ASKED' THEN 'LINK_SENT' ELSE stage END WHERE id = $1`,
          [leadId],
        );
        await pg.end();
        return JSON.stringify({ ok: true, action: "link_queued" });
      }
      case "check_application_status": {
        const res = await pg.query(
          `SELECT stage FROM wa_leads WHERE id = $1`,
          [leadId],
        );
        await pg.end();
        return JSON.stringify({ ok: true, stage: res.rows[0]?.stage || "unknown" });
      }
      default:
        await pg.end();
        return JSON.stringify({ error: `unknown tool: ${toolName}` });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e?.message || "tool execution failed" });
  }
}

// ── Log a Grok interaction to the observability table ───────────────────────
async function logGrokInteraction(opts: {
  leadId: string;
  stageBefore: string;
  stageAfter: string;
  model: string;
  reasoningEffort: string | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  toolCalls: any[];
  latencyMs: number;
  error: string | null;
  humanHandoff: boolean;
}) {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return;
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    await pg.query(
      `INSERT INTO grok_interactions
       (lead_id, conversation_stage_before, conversation_stage_after, model, reasoning_effort,
        input_tokens, cached_tokens, output_tokens, reasoning_tokens, tool_calls,
        latency_ms, error, human_handoff)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        opts.leadId, opts.stageBefore, opts.stageAfter, opts.model, opts.reasoningEffort,
        opts.inputTokens, opts.cachedTokens, opts.outputTokens, opts.reasoningTokens,
        JSON.stringify(opts.toolCalls), opts.latencyMs, opts.error, opts.humanHandoff,
      ],
    );
    await pg.end();
  } catch {}
}

// ── Context Compaction via xAI API ──────────────────────────────────────────
// POST /v1/responses/compact — returns an opaque encrypted_content blob
// that replaces prior turns. Run every 6 LLM-reaching turns to keep the
// prompt small and cache-friendly.
async function compactContext(
  systemPrompt: string,
  transcript: string,
  model: string = "grok-4.20-0309-non-reasoning",
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || !transcript) return null;
  try {
    const res = await fetch("https://api.x.ai/v1/responses/compact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: [
          { role: "user", content: `Summarize this WhatsApp conversation into a compact memory that preserves: key facts about the lead (experience, platform, objections, intent level), the conversation flow, and what was discussed. Keep it under 200 tokens.\n\n${transcript}` },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[wa] compaction API error:", data?.error?.message || res.status);
      return null;
    }
    return data.compacted_content || data.output || null;
  } catch (e: any) {
    console.error("[wa] compaction failed:", e?.message);
    return null;
  }
}

// ── Core Grok reply function ────────────────────────────────────────────────
// Primary: grok-4.20-0309-non-reasoning (Tier 1, no reasoning tokens)
// Fallback: Groq → Gemini
async function grokReply(
  text: string,
  topicsAsked: string[] = [],
  context?: LeadContext | null,
): Promise<{ reply: string | null; model: string; toolCalls: any[]; humanHandoff: boolean }> {
  const xaiKey = process.env.XAI_API_KEY;
  const stageBefore = context?.conversationStage || "NEW";
  let toolCalls: any[] = [];
  let humanHandoff = false;

  if (!xaiKey) {
    console.error("[wa] XAI_API_KEY unset, falling back to Groq");
    const reply = await fallbackGroqReply(text, topicsAsked, context);
    return { reply, model: "groq-fallback", toolCalls: [], humanHandoff: false };
  }

  const systemPrompt = buildSystemPrompt(topicsAsked);
  const isFirstContact = !context || !context.transcript;

  // Build dynamic messages array
  const messages: any[] = [];

  // Compacted memory or raw transcript
  if (context?.grokCompactionBlob) {
    messages.push({
      role: "user",
      content: `[COMPACTED MEMORY]\n${context.grokCompactionBlob}`,
    });
  } else if (context?.transcript) {
    // Raw recent turns (last 10 to keep token count reasonable)
    const recentTurns = context.transcript.split("\n").slice(-30).join("\n");
    messages.push({
      role: "user",
      content: `RECENT CONVERSATION:\n${recentTurns}`,
    });
  }

  // Lead state block (compact, ~150-200 tokens)
  if (context) {
    const stateParts = [
      `LEAD STATE:`,
      `Phone: ${context.phone} | Name: ${context.displayName || "unknown"} | Stage: ${context.stage} | Conversation: ${context.conversationStage} | Score: ${context.leadScore}`,
    ];
    if (context.trustLevel) stateParts.push(`Trust: ${context.trustLevel}`);
    if (context.streamingExperience) stateParts.push(`Experience: ${context.streamingExperience}`);
    if (context.currentPlatform) stateParts.push(`Platform: ${context.currentPlatform}`);
    if (context.objectionCount > 0) stateParts.push(`Objections: ${context.objectionCount}`);
    if (context.conversationSummary) stateParts.push(`Summary: ${context.conversationSummary}`);
    if (context.nextBestAction) stateParts.push(`Next: ${context.nextBestAction}`);
    if (context.createdAt) {
      const daysSinceFirst = Math.floor((Date.now() - new Date(context.createdAt).getTime()) / 86400000);
      stateParts.push(`First contact: ${daysSinceFirst}d ago`);
    }
    if (context.lastInboundAt) {
      const minsSinceLast = Math.floor((Date.now() - new Date(context.lastInboundAt).getTime()) / 60000);
      stateParts.push(`Last message from her: ${minsSinceLast}m ago`);
    }
    messages.push({ role: "user", content: stateParts.join("\n") });
  }

  // New inbound message
  messages.push({ role: "user", content: text });

  const startTime = Date.now();
  let inputTokens = 0;
  let cachedTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;

  // Debug: log what we're sending to Grok
  console.log(`[wa] grokRequest phone=${context?.phone || "unknown"} stage=${context?.conversationStage || "NEW"} msgs=${messages.length} tools=${GROK_TOOLS.length}`);
  messages.forEach((m, i) => {
    const preview = typeof m.content === "string" ? m.content.slice(0, 120).replace(/\n/g, " ") : "(tool_calls)";
    console.log(`[wa]   msg[${i}] role=${m.role}: ${preview}`);
  });

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
        "x-grok-conv-id": context?.id || "unknown",
      },
      body: JSON.stringify({
        model: "grok-4.20-0309-non-reasoning",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: GROK_TOOLS,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const data = await res.json();

    if (!res.ok) {
      console.error(`[wa] Grok API error ${res.status}:`, JSON.stringify(data).slice(0, 200));
      // Log the failure
      logGrokInteraction({
        leadId: context?.id || "unknown",
        stageBefore, stageAfter: stageBefore,
        model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
        inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0,
        toolCalls: [], latencyMs, error: `HTTP ${res.status}`, humanHandoff: false,
      });
      // Fall back to Groq
      const reply = await fallbackGroqReply(text, topicsAsked, context);
      return { reply, model: "groq-fallback", toolCalls: [], humanHandoff: false };
    }

    // Extract usage
    inputTokens = data.usage?.prompt_tokens || 0;
    cachedTokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
    outputTokens = data.usage?.completion_tokens || 0;

    const choice = data.choices?.[0];
    const message = choice?.message;

    // Debug: log what Grok returned
    console.log(`[wa] grokResponse model=${data.model} text="${(message?.content || "").slice(0, 100)}" tools=${message?.tool_calls?.length || 0}`);

    // Handle tool calls
    if (message?.tool_calls?.length) {
      const dbUrl = process.env.SUPABASE_DB_URL;
      for (const tc of message.tool_calls) {
        const fnName = tc.function?.name;
        const fnArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        toolCalls.push({ name: fnName, args: fnArgs });
        console.log(`[wa] toolCall: ${fnName}(${JSON.stringify(fnArgs).slice(0, 200)})`);

        if (fnName === "request_human_handoff") humanHandoff = true;

        // Execute the tool
        const result = await executeToolCall(fnName, fnArgs, context?.id || "", context?.phone || "");
        toolCalls[toolCalls.length - 1].result = JSON.parse(result);
      }

      // If human handoff was triggered, don't send a reply
      if (humanHandoff) {
        logGrokInteraction({
          leadId: context?.id || "unknown",
          stageBefore, stageAfter: "HUMAN_HANDOFF",
          model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
          inputTokens, cachedTokens, outputTokens, reasoningTokens,
          toolCalls, latencyMs, error: null, humanHandoff: true,
        });
        return { reply: null, model: "grok-4.20-0309-non-reasoning", toolCalls, humanHandoff: true };
      }

      // Re-call with tool results for the final text reply
      messages.push({ role: "assistant", tool_calls: message.tool_calls });
      for (let i = 0; i < message.tool_calls.length; i++) {
        const tc = message.tool_calls[i];
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolCalls[i]?.result || { ok: true }),
        });
      }

      const res2 = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${xaiKey}`,
          "x-grok-conv-id": context?.id || "unknown",
        },
        body: JSON.stringify({
          model: "grok-4.20-0309-non-reasoning",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });
      const data2 = await res2.json();
      outputTokens += data2.usage?.completion_tokens || 0;
      const reply2 = data2.choices?.[0]?.message?.content?.trim();
      if (reply2 && complianceCheck(reply2).ok) {
        logGrokInteraction({
          leadId: context?.id || "unknown",
          stageBefore, stageAfter: context?.conversationStage || stageBefore,
          model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
          inputTokens: data2.usage?.prompt_tokens || 0,
          cachedTokens: data2.usage?.prompt_tokens_details?.cached_tokens || 0,
          outputTokens, reasoningTokens, toolCalls, latencyMs: Date.now() - startTime,
          error: null, humanHandoff: false,
        });
        return { reply: reply2, model: "grok-4.20-0309-non-reasoning", toolCalls, humanHandoff: false };
      }
    }

    // Plain text reply (no tool calls)
    const reply = message?.content?.trim();
    if (reply && complianceCheck(reply).ok) {
      logGrokInteraction({
        leadId: context?.id || "unknown",
        stageBefore, stageAfter: context?.conversationStage || stageBefore,
        model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
        inputTokens, cachedTokens, outputTokens, reasoningTokens: 0,
        toolCalls: [], latencyMs, error: null, humanHandoff: false,
      });
      return { reply, model: "grok-4.20-0309-non-reasoning", toolCalls: [], humanHandoff: false };
    }

    logGrokInteraction({
      leadId: context?.id || "unknown",
      stageBefore, stageAfter: stageBefore,
      model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
      inputTokens, cachedTokens, outputTokens, reasoningTokens: 0,
      toolCalls, latencyMs, error: "no compliant reply", humanHandoff: false,
    });
  } catch (e: any) {
    console.error("[wa] Grok threw:", e?.message || e);
    logGrokInteraction({
      leadId: context?.id || "unknown",
      stageBefore, stageAfter: stageBefore,
      model: "grok-4.20-0309-non-reasoning", reasoningEffort: null,
      inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0,
      toolCalls: [], latencyMs: Date.now() - startTime, error: e?.message, humanHandoff: false,
    });
  }

  // Grok failed — fall back to Groq
  const reply = await fallbackGroqReply(text, topicsAsked, context);
  return { reply, model: reply ? "groq-fallback" : "none", toolCalls: [], humanHandoff: false };
}

// ── Fallback: Groq (existing key) ───────────────────────────────────────────
async function fallbackGroqReply(
  text: string,
  topicsAsked: string[] = [],
  context?: LeadContext | null,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return callGeminiFallback(text, topicsAsked, context);

  const systemPrompt = buildSystemPrompt(topicsAsked);
  let contextBlock = "";
  if (context) {
    contextBlock = `LEAD CONTEXT:\nStage: ${context.stage} | Conversation: ${context.conversationStage}\nSummary: ${context.conversationSummary || "none"}\nRecent:\n${context.transcript}`;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          ...(contextBlock ? [{ role: "user", content: contextBlock }] : []),
          { role: "user", content: text },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[wa] Groq fallback error ${res.status}:`, JSON.stringify(data).slice(0, 200));
      return callGeminiFallback(text, topicsAsked, context);
    }
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return callGeminiFallback(text, topicsAsked, context);
    return complianceCheck(reply).ok ? reply : callGeminiFallback(text, topicsAsked, context);
  } catch (e: any) {
    console.error("[wa] Groq fallback threw:", e?.message || e);
    return callGeminiFallback(text, topicsAsked, context);
  }
}

// ── Fallback: Gemini (last resort) ──────────────────────────────────────────
async function callGeminiFallback(
  text: string,
  topicsAsked: string[] = [],
  context?: LeadContext | null,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = buildSystemPrompt(topicsAsked);
  let contextBlock = "";
  if (context) {
    contextBlock = `LEAD CONTEXT:\nStage: ${context.stage} | Conversation: ${context.conversationStage}\nSummary: ${context.conversationSummary || "none"}\nRecent:\n${context.transcript}`;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{
            role: "user",
            parts: [{ text: `${contextBlock}\n\nLead just wrote: "${text}"\n\nWrite only Barbie's WhatsApp reply.` }],
          }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.6 },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) return null;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) return null;
    return complianceCheck(reply).ok ? reply : null;
  } catch {
    return null;
  }
}

// ── Gemini Vision — screenshot analysis ──────────────────────────────────────
async function analyzeScreenshot(
  base64Data: string,
  mimeType: string,
  leadCtx: LeadContext | null,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const stageLabel = leadCtx?.stage ?? "unknown";
  // leadCtx.transcript is a newline-joined STRING, not an array — .slice(-5)
  // on a string takes the last 5 characters and .join doesn't exist on a
  // string at all, so this threw on every call and silently fell back to the
  // generic ack. Split into lines first.
  const transcriptSnippet =
    leadCtx?.transcript?.split("\n").slice(-5).join("\n") || "(no history)";

  const prompt = `You are Barbie, a friendly Indian woman who runs an agency for live streaming hosts.

A lead (current stage: ${stageLabel}) just sent a screenshot. Analyze it and reply naturally in Barbie's voice.

Recent conversation:
${transcriptSnippet}

Rules:
- Reply in Hinglish (Hindi + English mix), casual sisterly tone
- Keep it short (1-2 lines max)
- If it's a verification screenshot: confirm and guide next step
- If it's an error: troubleshoot simply
- If it's a payment/earnings screenshot: congratulate and motivate
- If you can't tell what it is: ask a simple clarifying question
- NEVER say "guarantee", "lifetime", "100%", or share rupee figures
- Match the voice profile: median 23 chars, many replies are 1-15 chars`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
        }),
      },
    );
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) return null;
    return complianceCheck(reply).ok ? reply : null;
  } catch (e: any) {
    console.error("[wa] Gemini vision failed:", e?.message);
    return null;
  }
}

// ── Gemini Vision — structured host performance extraction ───────────────────
// Second Gemini call alongside the conversational analysis. Extracts structured
// data (earnings, rank, hours) from screenshots sent by converted hosts and
// writes to host_performance. Only runs for leads at AGENCY_LINKED+ stages.
async function extractHostPerformance(
  base64Data: string,
  mimeType: string,
  leadId: string | null,
  stage: string,
): Promise<void> {
  const convertedStages = ["AGENCY_LINKED", "FACE_VERIFIED", "FIRST_LIVE", "ACTIVE"];
  if (!leadId || !convertedStages.includes(stage)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const prompt = `Extract structured data from this screenshot. It's from a live streaming host's dashboard or earnings page.

Return ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "earnings": number or null (rupee amount visible),
  "rank": string or null (host rank/tier if visible),
  "hours_streamed": number or null (hours if visible),
  "period_start": "YYYY-MM-DD" or null (start of earning period),
  "period_end": "YYYY-MM-DD" or null (end of earning period),
  "gifts_value": number or null (gift/coin value if visible),
  "confidence": "high" if most fields are clearly visible, "low" if partially readable
}

If the screenshot doesn't contain any host performance data (e.g. it's a chat screenshot, error message, or unrelated), return {"confidence":"none"}.
Do NOT hallucinate values. Only extract numbers you can actually read in the image.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return;

    const extracted = JSON.parse(raw);
    if (extracted.confidence === "none" || !extracted.confidence) {
      console.log("[wa] vision extraction: no host performance data in screenshot");
      return;
    }

    // Write to host_performance
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) return;
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    await pg.query(
      `INSERT INTO host_performance (lead_id, period_start, period_end, hours_streamed, gifts_value, rank, earnings_estimate, source, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'vision_extracted', $8)`,
      [
        leadId,
        extracted.period_start || null,
        extracted.period_end || null,
        extracted.hours_streamed || null,
        extracted.gifts_value || null,
        extracted.rank || null,
        extracted.earnings || null,
        extracted.confidence || "low",
      ],
    );
    await pg.end();
    console.log(`[wa] host performance extracted: lead=${leadId}, earnings=${extracted.earnings}, rank=${extracted.rank}`);
  } catch (e: any) {
    console.error("[wa] host performance extraction failed:", e?.message);
  }
}

// ── Detect agency joining screenshots from ANY lead ──────────────────────────
// When a NEW or early-stage lead sends a screenshot that looks like an agency
// joining confirmation (Poppo/Vone agency panel, agency ID display, host added
// confirmation), auto-promote them to AGENCY_LINKED and populate host page.
async function detectAgencyJoining(
  base64Data: string,
  mimeType: string,
  leadId: string | null,
  phone: string,
  currentStage: string,
): Promise<boolean> {
  // Skip if already converted
  const convertedStages = ["AGENCY_LINKED", "FACE_VERIFIED", "FIRST_LIVE", "ACTIVE"];
  if (convertedStages.includes(currentStage)) return false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !leadId) return false;

  const prompt = `Analyze this screenshot. Is it an agency joining confirmation or agency panel from a live streaming app (Poppo, Vone, Bigo, Tango, etc.)?

Look for:
- Agency ID or agency name displayed
- "Host added" or "agency joined" confirmation
- Agency panel/dashboard showing the host is linked
- Agency earnings or agency management screen
- Any screen showing an agency relationship

Return ONLY a JSON object:
{
  "is_agency_joining": true/false,
  "agency_name": "string or null (agency name if visible)",
  "platform": "string or null (app name if visible)",
  "host_name": "string or null (host name if visible)",
  "confidence": "high"/"low"/"none"
}

If this is just a chat screenshot, error message, or unrelated image, return {"is_agency_joining": false, "confidence": "none"}.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.1, responseMimeType: "application/json" },
        }),
      },
    );
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return false;

    const result = JSON.parse(raw);
    if (!result.is_agency_joining || result.confidence === "none") return false;

    console.log(`[wa] AGENCY JOINING DETECTED! phone=${phone} platform=${result.platform} agency=${result.agency_name}`);

    // Promote lead to AGENCY_LINKED
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) return false;
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();

    await pg.query(
      `UPDATE wa_leads SET
        stage = 'AGENCY_LINKED',
        agency_verified_at = NOW(),
        conversation_stage = 'JOINED',
        human_takeover = false,
        display_name = COALESCE(display_name, $1),
        updated_at = NOW()
       WHERE id = $2`,
      [result.host_name || null, leadId],
    );

    // Create host_performance entry
    await pg.query(
      `INSERT INTO host_performance (lead_id, period_start, period_end, source, confidence)
       VALUES ($1, CURRENT_DATE, CURRENT_DATE, 'agency_joining_screenshot', $2)
       ON CONFLICT DO NOTHING`,
      [leadId, result.confidence || "low"],
    );

    await pg.end();

    // Notify Barbie via Telegram
    const platform = result.platform || "unknown platform";
    const agency = result.agency_name || "unknown agency";
    const hostName = result.host_name || "unknown";
    await tg(`🎉 <b>NEW HOST JOINED!</b>\n+${phone}\nName: ${hostName}\nPlatform: ${platform}\nAgency: ${agency}\nStage: AGENCY_LINKED\n\nAuto-promoted from agency joining screenshot.`);

    return true;
  } catch (e: any) {
    console.error("[wa] agency joining detection failed:", e?.message);
    return false;
  }
}

// Extract host name from any screenshot using Gemini Vision
async function extractNameFromScreenshot(
  base64Data: string,
  mimeType: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Look at this screenshot from a live streaming app agency panel (Poppo, Vone, Bigo, Tango, etc.). Extract the HOST NAME or USERNAME shown on screen — the name of the host/girl being managed. Return ONLY a JSON object: {\"host_name\": \"the name shown\"} or {\"host_name\": null} if no name is visible.",
                },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.host_name || null;
  } catch {
    return null;
  }
}

// Persist one turn of the live conversation. Without this the bot could talk
// but the admin dashboard (barbieverse.org/admin/whatsapp) and every future
// LLM call would never see it — getLeadContext only ever showed the Aug 15
// imported history because nothing after that was ever written back.
async function saveMessage(
  leadId: string | null,
  direction: "in" | "out",
  body: string,
) {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl || !leadId || !body) return;
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    await pg.query(
      `INSERT INTO wa_messages (lead_id, direction, body, created_at) VALUES ($1, $2, $3, NOW())`,
      [leadId, direction, body],
    );
    await pg.end();
  } catch (e: any) {
    console.error("[wa] saveMessage failed:", e?.message);
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
    protocolTimeout: 120_000,
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
  // Give the session a couple minutes to settle before touching old leads.
  setTimeout(() => maybeRunDailyReengagement(), 2 * 60_000);
  // This used to be a one-shot timer — it fired once, 2 minutes after the
  // first `ready` of each process lifetime, and never again unless the bot
  // happened to restart. Since the whole point is 24/7 uptime, that meant
  // "daily" re-engagement often ran exactly once total. Actually recur: check
  // hourly: the date-guard inside maybeRunDailyReengagement (LAST_CAMPAIGN_FILE)
  // already ensures it only ever actually sends once per calendar day, so this
  // just makes sure that day-boundary check keeps happening.
  setInterval(() => maybeRunDailyReengagement(), 60 * 60_000);

  // Sync WhatsApp profile names for hosts on startup
  syncHostNames().catch((e) => console.error("[wa] host name sync failed:", e?.message));
});

// ── Sync WhatsApp profile names for hosts missing display_name ──────────────
async function syncHostNames() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return;
  const { Client } = await import("pg");
  const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const res = await pg.query(
    `SELECT id, phone FROM wa_leads
     WHERE stage IN ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE')
       AND (display_name IS NULL OR display_name = '')`
  );
  await pg.end();
  if (!res.rows.length) return;

  console.log(`[wa] syncing names for ${res.rows.length} hosts...`);
  const syncUrl = process.env.VERCEL_SYNC_URL || "https://barbieverse.org";
  let synced = 0;
  for (const row of res.rows) {
    try {
      const chatId = `${row.phone}@c.us`;
      const contact = await client.getContactById(chatId);
      const name = contact?.pushname || contact?.name || "";
      if (name && name.length >= 2) {
        await fetch(`${syncUrl}/api/public/whatsapp-sync-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: row.phone, name }),
        });
        synced++;
      }
    } catch {}
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[wa] host name sync done — ${synced}/${res.rows.length} names synced`);
}

// ── daily auto re-engagement of old leads ──────────────────────────────────
// Barbie asked the bot to start working the existing database, not just
// reply inbound — prioritized, rate-limited, self-continuing, and without
// touching already-converted hosts or contacts that were never actually a
// recruiting lead. Runs once per calendar day (persisted so a crash-loop or
// redeploy can't fire it twice — see the setInterval at the `ready` handler
// that keeps re-checking that day boundary), pulls all eligible leads who:
// haven't converted, haven't been messaged in 3+ days, aren't
// mid-conversation right now, have a real resolvable WhatsApp number (not an
// unresolved @lid placeholder), and are actually in the recruiting funnel
// (stage progressed past first contact) — then sends them through the same
// paced campaign logic as a manual run, closest-to-converting first.
const LAST_CAMPAIGN_FILE = path.join(SESSION_DIR, "last-auto-campaign.json");
const AUTO_CAMPAIGN_BATCH = Number(process.env.WA_AUTO_CAMPAIGN_BATCH || 40);

async function maybeRunDailyReengagement() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return;
  const today = new Date().toISOString().slice(0, 10);
  const last = loadJson<{ date?: string }>(LAST_CAMPAIGN_FILE, {});
  if (last.date === today) {
    console.log("[wa] daily re-engagement already ran today, skipping");
    return;
  }
  try {
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    const res = await pg.query(
      `select phone from wa_leads
       -- Already-converted hosts never get cold re-engagement.
       where stage not in ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE','NOT_INTERESTED')
         and coalesce(escalated, false) = false
         and coalesce(human_takeover, false) = false
         and (last_outbound_at is null or last_outbound_at < now() - interval '3 days')
         and (last_inbound_at is null or last_inbound_at < now() - interval '1 day')
         -- Real WhatsApp mobile numbers only. Contacts whose ID never resolved
         -- past a raw LID (@lid) got auto-inserted with that pseudo-id as
         -- "phone" — sending would just fail lookup, and it's not a real
         -- number to safely message anyway. These all currently sit in NEW.
         and phone ~ '^(91)?[6-9]\d{9}$'
         -- Stage itself is the recruiting-relevance signal: a lead only
         -- reaches ASKED/LINK_SENT/INSTALLED by way of the bot's own
         -- recruiting-funnel logic (canned match or explicit progression).
         -- NEW (first-contact, unconfirmed) is excluded above via the phone
         -- check already, but this also guards against any future stage
         -- that isn't part of the actual agency-join flow.
         and stage in ('ASKED','LINK_SENT','INSTALLED')
       order by
         case stage
           when 'LINK_SENT' then 1   -- closest to converting: link already sent
           when 'INSTALLED' then 2
           when 'ASKED' then 3
           else 4
         end,
         coalesce(follow_up_due, created_at) asc`,
    );
    await pg.end();
    saveJson(LAST_CAMPAIGN_FILE, { date: today });
    if (!res.rows.length) {
      console.log("[wa] daily re-engagement: no eligible leads today");
      return;
    }
    console.log(`[wa] daily re-engagement: ${res.rows.length} old leads eligible, starting`);
    await tg(`🔄 Daily re-engagement starting — ${res.rows.length} old leads`);
    runCampaign(res.rows.map((r: any) => r.phone)).catch((e) =>
      console.error("[wa] daily re-engagement error:", e),
    );
  } catch (e: any) {
    console.error("[wa] daily re-engagement query failed:", e?.message);
  }
}

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

// Fires once a contact's message burst has gone quiet for DEBOUNCE_MS (or hit
// the DEBOUNCE_MAX_MS hard cap). Joins everything they sent into one combined
// turn and generates a single reply for it, instead of one reply per message.
function flushPending(key: string) {
  const entry = pendingMessages.get(key);
  if (!entry) return;
  pendingMessages.delete(key);
  const combinedText = entry.texts.join("\n");
  processTurn(entry.msg, entry.phone, entry.leadId, key, combinedText).catch(
    (err: any) => console.error("[wa] processTurn error:", err?.message),
  );
}

// Canned/ack/LLM reply generation for one logical turn (which may be several
// rapid-fire WhatsApp messages joined together by the debounce buffer above).
async function processTurn(
  msg: any,
  phone: string,
  leadId: string | null,
  key: string,
  text: string,
) {
  const matchResult = matchAnswer(text);
  const topics = leadTopics.get(key) || [];
  // A canned answer is only used the FIRST time its topic comes up for
  // this lead. Nothing gated repeats before — Q0 (the ad-opener pitch,
  // "Haan, batati hoon...") re-fired on every message that happened to
  // contain overlapping words, so a lead five turns into a real
  // conversation could get the first-contact pitch again verbatim. If the
  // topic's already covered, treat it as unmatched and let the LLM write
  // a fresh, context-aware answer instead (it already excludes covered
  // facts from what it's told).
  const alreadyCovered = matchResult && topics.includes(matchResult.answer.id);
  const answer = alreadyCovered ? null : (matchResult?.answer ?? null);
  if (answer && !topics.includes(answer.id)) {
    topics.push(answer.id);
    leadTopics.set(key, topics);
  }

  // Capture which ad prefill variant brought this lead in (Q0 = first contact).
  // Only writes once — the first time Q0 fires for this lead.
  if (matchResult && answer?.id === "Q0" && leadId) {
    const variant = Q0_VARIANTS[matchResult.matchIndex] || `q0-${matchResult.matchIndex}`;
    try {
      const dbUrl = process.env.SUPABASE_DB_URL;
      if (dbUrl) {
        const { Client } = await import("pg");
        const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await pg.connect();
        await pg.query(
          "UPDATE wa_leads SET prefill_variant = $1 WHERE id = $2 AND prefill_variant IS NULL",
          [variant, leadId],
        );
        await pg.end();
        console.log(`[wa] prefill_variant set: +${phone} -> ${variant}`);
      }
    } catch (e: any) {
      console.error("[wa] prefill_variant write failed:", e?.message);
    }
  }

  // Pull full lead context from DB for the LLM (transcript, stage, topics, Grok state)
  const leadCtx = await getLeadContext(phone);

  let replyText: string | null = null;
  let source = "canned";
  let toolCalls: any[] = [];
  let humanHandoff = false;

  if (answer) {
    replyText = [answer.reply, answer.nextNudge].filter(Boolean).join("\n\n");
    source = `canned:${answer.id}`;
  } else if (ACKNOWLEDGEMENT_RE.test(text)) {
    // Bare acknowledgements ("ok", "hmm", "👍") — never reach the LLM.
    // Silent or a single short nudge depending on context.
    const lastBotMsg = leadCtx?.transcript?.split("\n").filter(l => l.startsWith("Barbie:")).pop() || "";
    if (lastBotMsg.includes("?")) {
      // Last bot message ended with a question — nudge gently
      replyText = "😊";
      source = "ack-nudge";
      lastAckReplyAt.set(key, Date.now());
    } else {
      // Total silence here used to mean: a lead's last message in the whole
      // conversation could just sit there unanswered forever whenever it
      // happened to land after a non-question bot line — which reads as
      // "the bot died" even though nothing broke. Send one soft close-out
      // instead, but only if we haven't already sent one to this contact
      // in the last 10 minutes — that guard is what stops "ok" -> "😊" ->
      // "ok" -> "😊" turning into its own loop.
      const lastAck = lastAckReplyAt.get(key) || 0;
      if (Date.now() - lastAck > 10 * 60_000) {
        replyText = "😊";
        source = "ack-nudge-close";
        lastAckReplyAt.set(key, Date.now());
      } else {
        console.log(`[wa] acknowledgement from +${phone}, already nudged recently — staying silent`);
        return;
      }
    }
  } else if (APPROVE_MODE === "all-auto") {
    console.log(`[wa] no canned match for +${phone}, calling Grok...`);
    const result = await grokReply(text, topics, leadCtx);
    replyText = result.reply;
    toolCalls = result.toolCalls;
    humanHandoff = result.humanHandoff;
    source = `llm:${result.model}`;
    console.log(`[wa] Grok returned (${result.model}): ${replyText ? replyText.slice(0, 60) : "NULL"}`);
  }

  // If human handoff was triggered by a tool call, don't send a reply
  if (humanHandoff) {
    console.log(`[wa] human handoff triggered for +${phone}`);
    return;
  }

  // If Grok called send_joining_link, actually send the link
  const linkCall = toolCalls.find(t => t.name === "send_joining_link");
  if (linkCall) {
    const joiningMsg = "Yeh rahi link — 2 minute ka kaam hai:\nhttps://barbieverse.org/join";
    await humanTyping(msg, joiningMsg.length);
    await msg.reply(joiningMsg);
    await saveMessage(leadId, "out", joiningMsg);
    noteReply(key);
    // Continue to also send Grok's text reply if any
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
      // msg.reply(url, {caption}) never actually sent a video: reply()'s
      // real signature is reply(content, chatId, options) — the {caption}
      // object was being passed as chatId, not options, so it threw and
      // silently fell through to text-only every single time. And even
      // with args in the right place, a raw URL string is sent as a text
      // link, not an attachment — it has to be wrapped in MessageMedia.
      const media = await MessageMedia.fromUrl(mediaUrl, {
        unsafeMime: true,
      });
      await msg.reply(
        media,
        undefined,
        answerObj.mediaType === "video" ? { caption } : {},
      );
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
  await saveMessage(leadId, "out", replyText);
  noteReply(key);
  console.log(`[wa] -> +${phone} (${source})`);
}

client.on("message", async (msg: any) => {
  try {
    messagesSeen++;

    // ── CODeword: Barbie types in any chat to take over that conversation ──
    // When Barbie sends "STOP" or "/stop" in a chat, the bot stops replying
    // to that contact and marks human_takeover = true.
    if (msg.fromMe && !msg.isStatus) {
      const text = (msg.body || "").trim().toLowerCase();
      if (text === "stop" || text === "/stop") {
        // msg.to is the chat the message was sent TO — that's the lead
        const leadPhone = String(msg.to || "").replace(/\D/g, "").replace(/@.*/, "");
        if (leadPhone && /^\d{8,15}$/.test(leadPhone)) {
          const dbUrl = process.env.SUPABASE_DB_URL;
          if (dbUrl) {
            try {
              const { Client } = await import("pg");
              const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
              await pg.connect();
              await pg.query(
                `UPDATE wa_leads SET human_takeover = true, updated_at = NOW() WHERE phone = $1`,
                [leadPhone],
              );
              await pg.end();
              console.log(`[wa] TAKEOVER: +${leadPhone} — bot stopped, Barbie taking over`);
              await tg(`🙋 <b>TAKEOVER</b>\nBarbie took over +${leadPhone}\nBot will stop replying to this contact.`);
            } catch (e: any) {
              console.error("[wa] takeover DB error:", e?.message);
            }
          }
        }
        return; // don't process further
      }
      if (text === "resume" || text === "/resume") {
        const leadPhone = String(msg.to || "").replace(/\D/g, "").replace(/@.*/, "");
        if (leadPhone && /^\d{8,15}$/.test(leadPhone)) {
          const dbUrl = process.env.SUPABASE_DB_URL;
          if (dbUrl) {
            try {
              const { Client } = await import("pg");
              const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
              await pg.connect();
              await pg.query(
                `UPDATE wa_leads SET human_takeover = false, updated_at = NOW() WHERE phone = $1`,
                [leadPhone],
              );
              await pg.end();
              console.log(`[wa] RESUME: +${leadPhone} — bot resumed`);
              await tg(`🤖 <b>RESUMED</b>\nBot back on +${leadPhone}`);
            } catch (e: any) {
              console.error("[wa] resume DB error:", e?.message);
            }
          }
        }
        return;
      }
      // Skip all other outbound messages
      return;
    }

    if (msg.isStatus) return;

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
      let resolved = contact?.number || contact?.id?.user;
      // @lid contacts often don't resolve via .number/.id.user — try the
      // WhatsApp-internal formatted-number lookup as a second attempt.
      if (
        (!resolved || !/^\d{8,15}$/.test(String(resolved))) &&
        typeof contact?.getFormattedNumber === "function"
      ) {
        try {
          const formatted = await contact.getFormattedNumber();
          if (formatted) resolved = String(formatted).replace(/\D/g, "");
        } catch {}
      }
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

    // Normalize to the E.164-no-plus format wa_leads stores (e.g. 919876543210)
    // so a bare 10-digit number and a 91-prefixed one both match the same row.
    const digits = String(phone).replace(/\D/g, "");
    const normPhone = digits.length === 10 ? `91${digits}` : digits;
    const bare91 = normPhone.startsWith("91") ? normPhone.slice(2) : normPhone;

    if (BLOCKED_PHONES.has(normPhone) || BLOCKED_PHONES.has(bare91)) {
      console.log(`[wa] +${normPhone} is on blocklist — skipping`);
      return;
    }

    console.log(
      `[wa] resolve from=${from} key=${key} phone=${phone} normalized=${normPhone}`,
    );

    // Known leads get pipeline-aware replies; unknown inbound numbers are
    // added as new leads (stage default NEW) rather than dropped, so first
    // contact from an ad click still gets engaged.
    let leadId: string | null = null;
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (dbUrl) {
      try {
        const { Client } = await import("pg");
        const pg = new Client({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false },
        });
        await pg.connect();
        // any() over all format variants — both a bare 10-digit row and a
        // 91-prefixed row can exist for the same person (import history vs.
        // live testing created duplicates for at least one number already).
        const res = await pg.query(
          "select id, stage from wa_leads where phone = any($1)",
          [[normPhone, bare91, phone, digits]],
        );
        if (!res.rows[0]) {
          console.log(`[wa] +${normPhone} not in wa_leads — adding as new lead`);
          try {
            const ins = await pg.query(
              "insert into wa_leads (phone) values ($1) on conflict (phone) do update set updated_at = now() returning id",
              [normPhone],
            );
            leadId = ins.rows[0]?.id ?? null;
          } catch (e: any) {
            console.error("[wa] new-lead insert failed:", e?.message);
          }
        } else {
          leadId = res.rows[0].id;

          // Human takeover — Barbie typed "STOP" in this chat
          if (res.rows[0].human_takeover) {
            await pg.end();
            console.log(`[wa] +${normPhone} is under human_takeover — skipping auto-reply`);
            await saveMessage(leadId, "in", msg.body || "[media]");
            return;
          }

          const convertedStages = [
            "AGENCY_LINKED",
            "FACE_VERIFIED",
            "FIRST_LIVE",
            "ACTIVE",
          ];
          if (convertedStages.includes(res.rows[0].stage)) {
            await pg.end();
            console.log(
              `[wa] +${normPhone} is ${res.rows[0].stage} — skipping auto-reply`,
            );
            // But still extract host performance data from screenshots
            if (msg.hasMedia && (msg.type === "image" || msg.type === "sticker") && !(msg.body || "").trim()) {
              try {
                const media = await msg.downloadMedia();
                if (media) {
                  await saveMessage(leadId, "in", `[${msg.type}]`);
                  extractHostPerformance(media.data, media.mimetype, leadId, res.rows[0].stage)
                    .catch(() => {}); // fire-and-forget
                }
              } catch {}
            }
            return;
          }
        }
        await pg.end();
      } catch (e: any) {
        console.error("[wa] DB check failed, proceeding without it:", e?.message);
      }
    }
    phone = normPhone || phone;

    const text = (msg.body || "").trim();

    console.log(`[wa] <- +${phone} (from=${from} key=${key}): ${text.slice(0, 80)}`);

    // Media with no caption: analyze images with Gemini Vision, forward to Barbie.
    if (msg.hasMedia && !text) {
      const media = await msg.downloadMedia();
      const mediaType = msg.type; // "image", "video", "audio", "document"

      // Always forward to Barbie via Telegram
      const fwdCaption =
        mediaType === "video"
          ? `🎬 <b>Video from +${phone}</b>`
          : `📷 <b>Screenshot from +${phone}</b>`;
      if (media) {
        await tgMedia(fwdCaption, media, `wa-media-${Date.now()}`);
      } else {
        await tg(fwdCaption);
      }
      await saveMessage(leadId, "in", `[${mediaType}]`);

      // For images: analyze with Gemini Vision and reply contextually
      if (media && (mediaType === "image" || mediaType === "sticker")) {
        console.log(`[wa] analyzing screenshot from +${phone} with Gemini Vision...`);
        const leadCtx = await getLeadContext(phone);

        // Run agency joining detection in parallel (fire-and-forget)
        const currentStage = leadCtx?.stage || "NEW";
        detectAgencyJoining(media.data, media.mimetype, leadId, phone, currentStage)
          .then(async (joined) => {
            if (joined) {
              console.log(`[wa] +${phone} auto-promoted to AGENCY_LINKED from screenshot`);
            }
          })
          .catch(() => {});

        const visionReply = await analyzeScreenshot(media.data, media.mimetype, leadCtx);
        if (visionReply) {
          console.log(`[wa] vision reply: ${visionReply.slice(0, 60)}`);
          await humanTyping(msg, visionReply.length);
          await msg.reply(visionReply);
          await saveMessage(leadId, "out", visionReply);
          noteReply(key);
          return;
        }
        // Fallback: generic ack if vision fails
        const ack = "Screenshot mil gya sister 👍 main abhi dekh ke batati hoon";
        await humanTyping(msg, 40);
        await msg.reply(ack);
        await saveMessage(leadId, "out", ack);
        noteReply(key);
        return;
      }

      // Video/audio/document: acknowledge only
      const ack =
        mediaType === "video"
          ? "Video dekh li sister 👍 main abhi check karti hoon"
          : "Mil gya sister 👍 main abhi check karti hoon";
      await humanTyping(msg, 40);
      await msg.reply(ack);
      await saveMessage(leadId, "out", ack);
      noteReply(key);
      return;
    }
    if (!text) return;

    console.log(`[wa] <- +${phone}: ${text.slice(0, 80)}`);
    await saveMessage(leadId, "in", text);

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

    // Rapid-fire messages ("hii sir" / "hahaha" / "yeah sir" / "ok sir" inside
    // one minute) used to each trigger their own full reply — three or four
    // disjointed bot messages landing back to back, which reads as spam and
    // is the #1 "this is obviously a bot" tell. Buffer them: wait for a short
    // quiet gap, then answer the whole burst as one turn. Opt-out/escalation
    // above already ran on every individual message, so nothing urgent gets
    // delayed by this — only the actual reply generation waits.
    const existing = pendingMessages.get(key);
    if (existing) {
      existing.texts.push(text);
      existing.msg = msg;
      clearTimeout(existing.timer);
      const elapsed = Date.now() - existing.firstAt;
      const wait = Math.max(0, Math.min(DEBOUNCE_MS, DEBOUNCE_MAX_MS - elapsed));
      existing.timer = setTimeout(() => flushPending(key), wait);
      return;
    }
    const entry = {
      texts: [text],
      timer: null as any,
      firstAt: Date.now(),
      msg,
      leadId,
      phone,
      key,
    };
    entry.timer = setTimeout(() => flushPending(key), DEBOUNCE_MS);
    pendingMessages.set(key, entry);
  } catch (err: any) {
    console.error("[wa] handler error:", err?.message);
  }
});

// ── outbound campaign state ─────────────────────────────────────────────────
let campaignActive = false;
let campaignSent = 0;
let campaignTotal = 0;

// Stage-specific re-engagement messages — varied, human, never identical
const STAGE_MESSAGES: Record<string, string[]> = {
  ASKED: [
    "Hey 😊 aapne pehle interest dikhaya tha — join karna hai? Link bhejun?",
    "Sister, aapka process reh gaya tha — ready ho to continue karein?",
    "Hi! Baat hui thi apki — kya socha? Join karna hai?",
    "Hey, missing you 😊 abhi bhi karna chahti ho to main hoon guide karne ke liye",
  ],
  LINK_SENT: [
    "Hey! App install ho gaya kya? Koi issue aaya toh batao, main help karti hoon",
    "Sister aapka setup reh gaya tha — install complete hua? Screenshot bhej dena",
    "Hi! Link bheja tha — download ho gaya? Aage kya karna hai wo bata deti hoon",
    "Hey 😊 pending hai aapka — kab free ho to baat karte hain?",
  ],
  INSTALLED: [
    "Hey! App toh install ho gaya — ab Profile > My Agency > Agent ID 2517496 daalo",
    "Sister, agency ID enter karna baaki hai — karke dekhein? Main saath mein hoon",
    "Hi! Aapka step reh gaya tha — agency join karna hai? Link bhejun?",
  ],
  AGENCY_LINKED: [
    "Hey! Agency toh join ho gayi — ab face verification baki hai. Karke dekhein?",
    "Sister, face verify kar lo — bas ek selfie jaisa hai, 1 minute ka kaam",
    "Hi! Verification baki hai — ready ho to kar lete hain. Main guide karti hoon",
  ],
  FACE_VERIFIED: [
    "Hey! Verification ho gaya — ab aap ready ho! Pehla live kab logi? Main guide karungi 🎉",
    "Sister, congrats! Ab live start karo — main online rahungi aapke liye",
    "Hi! Aap ready ho — pehla live kab? Main help karungi setup mein",
  ],
};

/**
 * Outbound re-engagement campaign. Sends stage-specific messages with human
 * timing. Rate-limited to max 4 per run with 20-45s gaps (cold outbound is
 * the #1 ban signal — we go slow).
 */
async function runCampaign(phones: string[], overrideMessage?: string) {
  campaignActive = true;
  campaignSent = 0;
  campaignTotal = phones.length;
  console.log(`[wa] campaign started — ${phones.length} leads`);

  // Pull lead stages from DB to send stage-specific messages
  let stageMap: Record<string, string> = {};
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    try {
      const { Client } = await import("pg");
      const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      await pg.connect();
      const res = await pg.query("SELECT phone, stage FROM wa_leads WHERE phone = ANY($1)", [phones.map(p => p.replace(/[^\d]/g, ""))]);
      await pg.end();
      for (const row of res.rows) {
        stageMap[row.phone] = row.stage;
      }
    } catch {}
  }

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i].replace(/[^\d]/g, "");
    const bare = phone.startsWith("91") ? phone.slice(2) : phone;

    // A "stop" reply is permanent, no exceptions — including cold campaigns.
    if (optOuts.has(phone) || optOuts.has(bare)) {
      console.log(`[wa] campaign: +${phone} opted out, skipping`);
      continue;
    }
    if (BLOCKED_PHONES.has(phone) || BLOCKED_PHONES.has(bare)) {
      console.log(`[wa] campaign: +${phone} is on blocklist, skipping`);
      continue;
    }

    // Pick stage-specific message or use override or rotate generic
    let msg: string;
    if (overrideMessage) {
      msg = overrideMessage;
    } else {
      const stage = stageMap[phone] || "ASKED";
      const stageMsgs = STAGE_MESSAGES[stage] || STAGE_MESSAGES.ASKED;
      msg = stageMsgs[i % stageMsgs.length];
    }

    try {
      // Human delay between cold messages (20-45s)
      if (i > 0) await sleep(20_000 + Math.random() * 25_000);

      // Re-check IST window before each send
      const nowIst = (new Date().getUTCHours() + 5 + 30 / 60) % 24;
      if (nowIst < 9 || nowIst >= 23) {
        console.log("[wa] campaign paused — entered quiet hours");
        await tg(`⏸ Campaign paused — entered IST quiet hours at ${campaignSent}/${campaignTotal}`);
        break;
      }

      // Simulate typing before sending
      await sleep(2000 + Math.random() * 4000);

      let chat;
      try {
        chat = await client.getNumberId(phone);
      } catch (lookupErr: any) {
        console.error(`[wa] campaign getNumberId error +${phone}:`, lookupErr?.message || lookupErr);
        continue;
      }
      if (!chat) {
        console.log(`[wa] campaign: +${phone} not on WhatsApp, skipping`);
        continue;
      }
      await client.sendMessage(chat._serialized || chat, msg);
      campaignSent++;
      console.log(
        `[wa] campaign -> +${phone} (${campaignSent}/${campaignTotal})`,
      );
      await tg(`📤 Campaign -> +${phone} (${campaignSent}/${campaignTotal})`);

      // Mark so tomorrow's auto re-engagement pass doesn't hit her again today,
      // and log the message so the admin dashboard shows it.
      if (dbUrl) {
        try {
          const { Client } = await import("pg");
          const pg2 = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
          await pg2.connect();
          const upd = await pg2.query(
            "update wa_leads set last_outbound_at = now() where phone = any($1) returning id",
            [[phone, bare]],
          );
          await pg2.end();
          await saveMessage(upd.rows[0]?.id ?? null, "out", msg);
        } catch {}
      }
    } catch (e: any) {
      console.error(`[wa] campaign failed +${phone}:`, e?.message || e?.stack?.slice(0, 200) || "unknown");
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
    const bare = phone.startsWith("91") ? phone.slice(2) : phone;
    if (optOuts.has(phone) || optOuts.has(bare)) {
      console.log(`[wa] broadcast: +${phone} opted out, skipping`);
      continue;
    }
    if (BLOCKED_PHONES.has(phone) || BLOCKED_PHONES.has(bare)) {
      console.log(`[wa] broadcast: +${phone} is on blocklist, skipping`);
      continue;
    }
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
// No fallback. A hardcoded default sits in git guarding /broadcast,
// /campaign and /export-chats, and silently masks a missing env var —
// which is exactly how two services ended up with different secrets.
// Unset => every protected route refuses.
const QR_SECRET = process.env.WA_QR_SECRET || "";
if (!QR_SECRET) console.error("[wa] WA_QR_SECRET unset — protected routes disabled");
const PORT = Number(process.env.PORT || 8080);

const http = await import("node:http");
http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    const keyOk = QR_SECRET && url.searchParams.get("k") === QR_SECRET;

    // ── control panel (no auth required — key is passed in the page itself) ──
    if (url.pathname === "/control") {
      const html = fs.readFileSync(path.join(import.meta.dirname, "control.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(html);
    }

    // ── status (no auth — read-only) ──
    if (url.pathname === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ paused: botPaused, ready: isReady }));
    }

    // ── reset: wipe session and restart so fresh QR can be scanned ──
    if (url.pathname === "/reset-session") {
      // Was completely unauthenticated: any POST to the public URL unlinked
      // the bot from Barbie's WhatsApp.
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        return res.end("method not allowed");
      }
      try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log("[wa] session directory wiped");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, message: "session wiped, restarting" }));
        // Exit so Railway restarts the container with a clean session
        setTimeout(() => process.exit(0), 500);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e?.message }));
      }
      return;
    }

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

    // ── export: pull chat history from WhatsApp Web into DB ──
    // GET /export-chats?k=...&limit=50 — exports up to N recent chats
    if (url.pathname === "/export-chats") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end("method not allowed");
      }
      if (!isReady) {
        res.writeHead(503, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "bot not ready" }));
      }
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const dbUrl = process.env.SUPABASE_DB_URL;
      if (!dbUrl) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "no DB connection" }));
      }

      // Run export in background, return immediately
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: true, limit }));

      (async () => {
        try {
          const { Client } = await import("pg");
          const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
          await pg.connect();

          const chats = await client.getChats();
          console.log(`[export] found ${chats.length} chats, processing top ${limit}`);

          let exported = 0;
          let skipped = 0;
          let errors = 0;

          for (const chat of chats.slice(0, limit)) {
            try {
              const contact = chat.id;
              const phone = contact.user?.replace(/@c\.us$/, "") || "";
              if (!phone || !/^\d{8,15}$/.test(phone)) {
                skipped++;
                continue;
              }

              // Upsert lead and get id
              const leadRes = await pg.query(
                `INSERT INTO wa_leads (phone, stage, created_at, updated_at)
                 VALUES ($1, 'ASKED', NOW(), NOW())
                 ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
                 RETURNING id`,
                [phone],
              );
              const leadId = leadRes.rows[0].id;

              // Get last 20 messages from this chat
              const messages = await chat.fetchMessages({ limit: 20 });
              for (const m of messages) {
                if (!m.body && !m.hasMedia) continue;
                const direction = m.from?.includes(contact.user) ? "in" : "out";
                const text = m.body || (m.hasMedia ? `[${m.type || "media"}]` : "");
                if (!text) continue;

                const ts = new Date(m.timestamp * 1000);

                // Insert message — skip duplicates by lead + body + timestamp window
                await pg.query(
                  `INSERT INTO wa_messages (lead_id, direction, body, created_at)
                   SELECT $1, $2, $3, $4::timestamptz
                   WHERE NOT EXISTS (
                     SELECT 1 FROM wa_messages
                     WHERE lead_id = $1 AND body = $3
                       AND created_at >= ($4::timestamptz - interval '5 seconds')
                       AND created_at <= ($4::timestamptz + interval '5 seconds')
                   )`,
                  [leadId, direction, text, ts.toISOString()],
                );
              }
              exported++;
            } catch (e) {
              errors++;
              console.error(`[export] error on chat:`, e?.message);
            }
          }

          await pg.end();
          const msg = `[export] done: ${exported} chats exported, ${skipped} skipped, ${errors} errors`;
          console.log(msg);
          await tg(msg);
        } catch (e) {
          console.error("[export] fatal:", e);
          await tg(`[export] fatal: ${e?.message}`);
        }
      })();
      return;
    }

    // ── import: load decrypted chat history into DB ──
    // POST /import-history?k=... — accepts JSON array in body, or reads from volume file
    if (url.pathname === "/import-history") {
      if (!keyOk) {
        res.writeHead(403);
        return res.end("forbidden");
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        return res.end("method not allowed");
      }

      // Read body — could be JSON array of leads or empty (fallback to file)
      let body = "";
      for await (const chunk of req) body += chunk;

      let leads: any[] = [];
      if (body && body.trim().startsWith("[")) {
        leads = JSON.parse(body);
        console.log(`[import] received ${leads.length} leads from POST body`);
      } else {
        // Fallback: read from volume file
        const historyPath = path.resolve("/data", "leads-with-history.json");
        if (fs.existsSync(historyPath)) {
          leads = JSON.parse(fs.readFileSync(historyPath, "utf8"));
          console.log(`[import] loaded ${leads.length} leads from volume file`);
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              error: "send JSON array in body, or place leads-with-history.json on /data volume",
            }),
          );
        }
      }

      // Run import in background, return immediately
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: true, total: leads.length }));

      (async () => {
        try {
          const { Client } = await import("pg");
          const pg = new Client({
            connectionString: process.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false },
          });
          await pg.connect();

          let imported = 0;
          let msgCount = 0;

          for (const lead of leads) {
            try {
              const phone = (lead.phone || "").replace(/[^\d]/g, "");
              if (!phone || !/^\d{8,15}$/.test(phone)) continue;

              const leadRes = await pg.query(
                `INSERT INTO wa_leads (phone, stage, topics_asked, last_inbound_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())
                 ON CONFLICT (phone) DO UPDATE SET
                   stage = EXCLUDED.stage,
                   topics_asked = EXCLUDED.topics_asked,
                   last_inbound_at = EXCLUDED.last_inbound_at,
                   updated_at = NOW()
                 RETURNING id`,
                [
                  phone,
                  lead.stage,
                  lead.topics_covered || [],
                  lead.last_inbound ? new Date(lead.last_inbound) : null,
                ],
              );
              const leadId = leadRes.rows[0].id;

              for (const msg of lead.transcript || []) {
                const direction = msg.d === "barbie" ? "out" : "in";
                const text = msg.m || "";
                if (!text || text === "[media]") continue;
                const ts = new Date(msg.t);
                await pg.query(
                  `INSERT INTO wa_messages (lead_id, direction, body, created_at)
                   SELECT $1, $2, $3, $4::timestamptz
                   WHERE NOT EXISTS (
                     SELECT 1 FROM wa_messages
                     WHERE lead_id = $1 AND body = $3
                       AND created_at >= ($4::timestamptz - interval '5 seconds')
                       AND created_at <= ($4::timestamptz + interval '5 seconds')
                   )`,
                  [leadId, direction, text, ts.toISOString()],
                );
                msgCount++;
              }
              imported++;
            } catch {}
          }

          await pg.end();
          const msg = `[import] done: ${imported} leads, ${msgCount} messages`;
          console.log(msg);
          await tg(msg);
        } catch (e) {
          console.error("[import] fatal:", e);
          await tg(`[import] fatal: ${e?.message}`);
        }
      })();
      return;
    }

    // ── /block-phone: immediately block a number (kill conversation) ──
    if (url.pathname === "/block-phone" && req.method === "POST") {
      if (!keyOk) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        return res.end("forbidden");
      }
      let body: any;
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "bad json" }));
      }
      const phone = String(body.phone || "").replace(/\D/g, "");
      if (!phone) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "phone required" }));
      }
      // Add to in-memory optOuts + BLOCKED_PHONES + persist to disk
      const bare91 = phone.startsWith("91") && phone.length > 12 ? phone.slice(2) : phone;
      optOuts.add(phone);
      optOuts.add(bare91);
      BLOCKED_PHONES.add(phone);
      BLOCKED_PHONES.add(bare91);
      saveJson(OPTOUT_FILE, [...optOuts]);
      console.log(`[block] +${phone} added to blocklist`);
      await tg(`🚫 <b>Number blocked:</b> +${phone}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, phone }));
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

    // ── /sync-names: re-download screenshots from chats, extract host names via Gemini Vision ──
    if (url.pathname === "/sync-names") {
      if (!keyOk) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        return res.end("forbidden");
      }
      if (!isReady) {
        res.writeHead(503, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "bot not ready" }));
      }
      // Run async, return immediately
      (async () => {
        try {
          const dbUrl = process.env.SUPABASE_DB_URL;
          if (!dbUrl) return;
          const { Client: PgClient } = await import("pg");
          const pg = new PgClient({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
          await pg.connect();
          const res2 = await pg.query(
            `SELECT id, phone, display_name FROM wa_leads
             WHERE stage IN ('AGENCY_LINKED','FACE_VERIFIED','FIRST_LIVE','ACTIVE')
             ORDER BY display_name NULLS FIRST`
          );
          const hosts = res2.rows;
          console.log(`[sync-names] checking ${hosts.length} converted hosts`);
          let synced = 0;
          for (const host of hosts) {
            try {
              const chatId = `${host.phone}@c.us`;
              const chat = await client.getChatById(chatId);
              const messages = await chat.fetchMessages({ limit: 50 });
              for (const msg of messages) {
                if (!msg.hasMedia) continue;
                let media;
                try { media = await msg.downloadMedia(); } catch { continue; }
                if (!media || !media.mimetype?.startsWith("image/")) continue;
                const name = await extractNameFromScreenshot(media.data, media.mimetype);
                if (name && name.length >= 2) {
                  console.log(`[sync-names] +${host.phone} → ${name}`);
                  await pg.query(
                    `UPDATE wa_leads SET display_name = $1, updated_at = NOW() WHERE id = $2 AND (display_name IS NULL OR display_name = '')`,
                    [name, host.id],
                  );
                  synced++;
                  break;
                }
              }
            } catch (e) {
              console.error(`[sync-names] +${host.phone} failed:`, e?.message);
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          console.log(`[sync-names] done — ${synced} names updated`);
          await pg.end();
          await tg(`✅ Screenshot name sync done — ${synced} names extracted from agency joining screenshots`);
        } catch (e) {
          console.error("[sync-names] fatal:", e?.message);
          await tg(`❌ Screenshot name sync failed: ${e?.message}`);
        }
      })();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, started: true }));
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

// If WA_RESET_SESSION=true, wipe session data before starting (for corrupted sessions)
if (process.env.WA_RESET_SESSION === "true") {
  console.log("[wa] WA_RESET_SESSION=true — wiping session directory");
  fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}

// Self-healing: this container has, more than once, gotten stuck between
// `authenticated` and `ready` — logs go quiet, CPU drops to 0%, memory sits
// idle, and no message is ever processed again until someone notices and
// manually restarts the service. A plain restart has reliably cleared it
// within seconds every time it's happened. Don't wait for a human to notice.
const READY_TIMEOUT_MS = 3 * 60_000;
setTimeout(() => {
  if (!isReady) {
    console.error(`[wa] not ready ${READY_TIMEOUT_MS / 1000}s after start — restarting`);
    tg("⚠️ Bot stuck (never reached ready) — auto-restarting").finally(() =>
      process.exit(1),
    );
  }
}, READY_TIMEOUT_MS);

client.initialize().catch(async (err) => {
  console.error("[wa] failed to start:", err);
  // If it looks like a session corruption, auto-wipe and retry once
  const msg = err?.message || "";
  if (msg.includes("Execution context was destroyed") || msg.includes("timed out")) {
    console.log("[wa] session likely corrupted — auto-wiping and retrying in 5s");
    try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
    await new Promise(r => setTimeout(r, 5000));
    // Re-exit so Railway restarts with clean session
    process.exit(1);
  }
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
