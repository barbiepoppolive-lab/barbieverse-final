// Reddit — deliberately manual, always. Postiz (and most unified social
// APIs) technically CAN post to Reddit via API, but that capability is not
// used here on purpose: Reddit's own spam detection and community norms
// specifically target automated promotional posting from business
// accounts, and that's exactly what this pipeline would look like if it
// posted directly. See src/lib/social-publish/index.ts's header comment
// for the full reasoning.
//
// So this module does the honest version: generate the content, send it to
// Telegram with a reminder of Reddit's 10%-self-promo norm, and let a human
// decide whether today is actually a good day to post it, in which
// subreddit, and whether to soften it into a discussion/question instead of
// a straight pitch.

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export interface RedditDeliveryResult {
  ok: boolean;
  error?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends the finished post text to Telegram for manual, human-judgment
 * posting — this is the ONLY delivery path for Reddit in this app, by
 * design, regardless of whether Postiz or any other tool is configured.
 */
export async function deliverRedditContentForManualUpload(opts: {
  caption: string;
  hashtags?: string[];
  visualBrief?: string;
}): Promise<RedditDeliveryResult> {
  const config = getBotConfig();
  if (!config) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured" };
  }

  const text =
    `🤖 <b>Reddit — draft ready (always manual, by design)</b>\n\n` +
    `Reminder: keep this to roughly 1-in-10 posts self-promotional in whatever subreddit you use, and consider leading with a genuine question rather than a pitch.\n\n` +
    `<b>Draft:</b>\n<code>${escapeHtml(opts.caption)}</code>` +
    (opts.visualBrief ? `\n\n<b>Context/visual (optional):</b>\n${escapeHtml(opts.visualBrief)}` : "");

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Telegram send failed: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "unknown error" };
  }
}
