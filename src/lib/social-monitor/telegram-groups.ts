// Telegram host-group intent monitoring
//
// ── The idea ────────────────────────────────────────────────────────────
// Indian live-streaming hosts congregate in Telegram groups to compare
// agencies, ask about payouts, and find IDs. People in those groups are not
// cold prospects — they are actively shopping. Someone typing "koi acchi
// agency batao" is worth more than a hundred scraped handles.
//
// ── How it works ────────────────────────────────────────────────────────
// You add YOUR bot to groups you're a member of. Telegram then delivers
// group messages to the webhook you already run at /api/public/telegram-bot.
// This module scores each incoming group message for buying intent and
// alerts you when someone is worth replying to.
//
// ── Two constraints that are not optional ───────────────────────────────
// 1. PRIVACY MODE. By default a bot only sees messages that start with a
//    command or reply to it. To see normal group chatter you must message
//    @BotFather → /setprivacy → select your bot → Disable. Without this the
//    monitor receives nothing and will look broken.
//
// 2. A BOT CANNOT DM STRANGERS. Telegram forbids a bot from initiating a
//    conversation with a user who has never messaged it. There is no way
//    around this and that is a good thing — it makes mass-DM spam
//    impossible by design. So this module never tries to auto-message
//    anyone. It surfaces the person and their message to you, and you reply
//    in the group or reach out yourself. Detection is automated; the
//    approach stays human.
//
// Group etiquette matters more than volume here: most host groups ban
// obvious agency recruiters instantly. Answering a question helpfully in
// public converts far better than a pitch, and doesn't get you removed.

export interface IntentMatch {
  score: number;
  signals: string[];
  urgency: "high" | "medium" | "low";
}

/**
 * Strong intent — the person is explicitly looking for an agency or asking
 * how to start. These are worth a same-day reply.
 */
const HIGH_INTENT = [
  "agency batao", "acchi agency", "good agency", "best agency", "agency chahiye",
  "agency chaiye", "koi agency", "which agency", "agency suggest", "join agency",
  "id chahiye", "id chaiye", "id kaise", "how to join", "kaise join",
  "host banna", "host kaise", "streaming kaise shuru", "how to start streaming",
  "koi bata sakta", "guide kar do", "help karo start",
];

/**
 * Medium intent — dissatisfied with their current situation, or comparing.
 * Someone complaining about payouts is a very warm lead.
 */
const MEDIUM_INTENT = [
  "salary nahi", "payment nahi", "paisa nahi mila", "payout nahi",
  "agency change", "dusri agency", "leave agency", "agency chod",
  "kitna milta", "how much do you get", "target kitna", "beans kitne",
  "not paying", "scam agency", "fraud agency", "cheat kiya",
  "better agency", "compare agency", "switch",
];

/**
 * Context terms — confirm this is actually about live streaming and not a
 * random chat. Required, otherwise "how to join" matches everything.
 */
const CONTEXT_TERMS = [
  "poppo", "vone", "bigo", "chamet", "tango", "likee", "moj", "live",
  "stream", "host", "hosting", "beans", "diamond", "gifting", "pk",
];

/** Things that mean this is a recruiter/competitor, not a prospect. */
const NOT_A_PROSPECT = [
  "we provide", "hum dete", "dm for id", "contact for id", "agency owner",
  "join our", "hamari agency", "our agency", "salary guaranteed",
  "unlimited earning", "apply now", "vacancy",
];

function hits(text: string, list: string[]): string[] {
  const lower = text.toLowerCase();
  return list.filter((s) => lower.includes(s));
}

/**
 * Score a group message for whether it's someone worth talking to.
 * Returns null when the message isn't a prospect at all, which is most of
 * them — group chat is overwhelmingly noise and the alert threshold has to
 * be high or you'll stop reading the notifications.
 */
export function detectIntent(
  text: string,
  /**
   * True when the message came from a group that is itself clearly about
   * live streaming. In a group called "Poppo Hosts India", a bare "how to
   * join agency" needs no further context — the room supplies it. Without
   * this, the highest-intent messages in your best groups get dropped for
   * being too short to mention a platform by name.
   */
  groupIsStreamingContext = false
): IntentMatch | null {
  if (!text || text.trim().length < 8) return null;

  const context = hits(text, CONTEXT_TERMS);
  if (context.length === 0 && !groupIsStreamingContext) return null;

  const recruiter = hits(text, NOT_A_PROSPECT);
  if (recruiter.length > 0) return null; // this is a competitor advertising

  const high = hits(text, HIGH_INTENT);
  const medium = hits(text, MEDIUM_INTENT);

  if (high.length === 0 && medium.length === 0) return null;

  const signals: string[] = [];
  let score = 0;

  if (high.length > 0) {
    score += 60 + Math.min(high.length * 10, 20);
    signals.push(`asking for an agency/how to start: "${high[0]}"`);
  }
  if (medium.length > 0) {
    score += 35 + Math.min(medium.length * 8, 16);
    signals.push(`unhappy or comparing: "${medium[0]}"`);
  }
  if (context.length > 0) {
    score += Math.min(context.length * 4, 12);
    signals.push(`streaming context: ${context.slice(0, 3).join(", ")}`);
  } else {
    score += 8;
    signals.push("posted in a live-streaming group");
  }

  score = Math.min(100, score);

  return {
    score,
    signals,
    urgency: score >= 70 ? "high" : score >= 45 ? "medium" : "low",
  };
}

// ── Persistence + alerting ───────────────────────────────

export interface GroupMessageContext {
  chatId: string | number;
  chatTitle: string;
  messageId: number;
  userId: string | number;
  username?: string;
  firstName?: string;
  text: string;
}

async function alreadySeen(chatId: string, userId: string): Promise<boolean> {
  // One alert per person per group per day — group regulars repeat
  // themselves constantly and duplicate pings train you to ignore them.
  try {
    const { q } = await import("@/lib/db.server");
    const rows = await q<{ n: string }>(
      `SELECT count(*)::text AS n FROM social_leads
        WHERE platform = 'telegram'
          AND author_username = $1
          AND group_name = $2
          AND discovered_at > now() - interval '24 hours'`,
      [userId, chatId]
    );
    return parseInt(rows[0]?.n || "0", 10) > 0;
  } catch {
    return false;
  }
}

async function store(ctx: GroupMessageContext, intent: IntentMatch): Promise<void> {
  try {
    const { q } = await import("@/lib/db.server");
    const displayName = ctx.firstName || ctx.username || `user_${ctx.userId}`;
    await q(
      `INSERT INTO social_leads (
         platform, post_url, post_text, author_name, author_username,
         author_profile_url, keyword_matched, group_name, engagement_score,
         ai_confidence, ai_category, status, moj_fit_score, moj_fit_reason,
         contact_channel, contact_value, contact_action_url, contact_confidence
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (post_url) DO NOTHING`,
      [
        "telegram",
        `tg://message?chat=${ctx.chatId}&id=${ctx.messageId}`,
        ctx.text.slice(0, 2000),
        displayName,
        String(ctx.userId),
        ctx.username ? `https://t.me/${ctx.username}` : null,
        intent.signals[0] || "intent",
        String(ctx.chatId),
        0,
        intent.score / 100,
        intent.urgency === "high" ? "hot" : intent.urgency === "medium" ? "warm" : "cold",
        "queued_manual",
        intent.score,
        intent.signals.join("; "),
        // A public @username is the only reachable handle here — and even
        // then YOU message them, not the bot (see file header).
        ctx.username ? "telegram" : null,
        ctx.username || null,
        ctx.username ? `https://t.me/${ctx.username}` : null,
        ctx.username ? 0.9 : null,
      ]
    );
  } catch (e: any) {
    console.error("[telegram-groups] store failed:", e?.message);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function alertAdmin(ctx: GroupMessageContext, intent: IntentMatch): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !adminChat) return;

  const emoji = intent.urgency === "high" ? "🔥" : intent.urgency === "medium" ? "🟡" : "⚪";
  const who = ctx.username
    ? `@${escapeHtml(ctx.username)}`
    : `${escapeHtml(ctx.firstName || "someone")} (no public @username)`;

  const reachNote = ctx.username
    ? `👉 https://t.me/${ctx.username}`
    : `⚠️ No @username — you can only reach them by replying in the group.`;

  const text =
    `${emoji} <b>LIVE LEAD — ${escapeHtml(ctx.chatTitle)}</b>\n\n` +
    `<b>${who}</b> · intent ${intent.score}/100\n` +
    `<i>${escapeHtml(intent.signals.join("; "))}</i>\n\n` +
    `💬 <code>${escapeHtml(ctx.text.slice(0, 600))}</code>\n\n` +
    `${reachNote}\n\n` +
    `<i>Reply helpfully in the group first — most host groups ban open recruiting.</i>`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChat,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e: any) {
    console.error("[telegram-groups] alert failed:", e?.message);
  }
}

/**
 * Entry point called from the bot webhook for every non-command message
 * arriving from a group. Returns true when it was treated as a lead.
 */
/** Does the group's own name tell us it's about live streaming? */
const STREAMING_GROUP_TITLE = /poppo|vone|bigo|chamet|tango|likee|moj|host|live|stream|agency|anchor/i;

export async function handleGroupMessage(ctx: GroupMessageContext): Promise<boolean> {
  const groupIsStreamingContext = STREAMING_GROUP_TITLE.test(ctx.chatTitle || "");
  const intent = detectIntent(ctx.text, groupIsStreamingContext);
  if (!intent) return false;

  // Only surface medium+ — low-scoring matches are mostly chatter and
  // burying real leads under noise is how this stops getting read.
  if (intent.urgency === "low") return false;

  if (await alreadySeen(String(ctx.chatId), String(ctx.userId))) return false;

  await store(ctx, intent);
  await alertAdmin(ctx, intent);
  return true;
}
