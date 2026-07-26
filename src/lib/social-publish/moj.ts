// Moj Publishing — there is no public API. Confirmed: Moj/ShareChat has no
// documented developer platform for uploading or publishing content (that's
// exactly why src/lib/social-monitor/moj.ts has to scrape raw HTML just to
// READ Moj — there's nothing to post TO programmatically either).
//
// So this module doesn't pretend to auto-publish. It does the honest version
// of automation: generate the content, then hand it to you on Telegram in a
// copy-paste-ready format so uploading through the Moj app is the only manual
// step left, instead of "write the caption" *and* "upload it" both being
// manual. Matches the same Telegram flow used everywhere else in this app.

import { sendTelegramImages } from "./telegram-media";

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export interface MojDeliveryResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends the finished caption + hashtags + a visual brief to Telegram for
 * manual upload. Not a "publish" in the API sense — see file header.
 */
export async function deliverMojContentForManualUpload(opts: {
  caption: string;
  hashtags?: string[];
  visualBrief?: string;
  imageUrl?: string;
}): Promise<MojDeliveryResult> {
  const config = getBotConfig();
  if (!config) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured" };
  }

  // Send the reference photo first (thumbnail/vibe reference for the video
  // you'll actually film) — previously this was generated and thrown away,
  // so every Moj delivery arrived as text only.
  await sendTelegramImages({ imageUrl: opts.imageUrl, label: "🎬 Moj — reference image" });

  const hashtagLine = opts.hashtags && opts.hashtags.length > 0
    ? `\n\n${opts.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : "";

  const text =
    `🎬 <b>Moj — ready to upload (no auto-publish possible)</b>\n\n` +
    `Moj has no public API, so this one needs you: copy the caption below, upload the matching video through the Moj app.\n\n` +
    `<b>Caption:</b>\n<code>${escapeHtml(opts.caption)}${escapeHtml(hashtagLine)}</code>` +
    (opts.visualBrief ? `\n\n<b>What to film/use:</b>\n${escapeHtml(opts.visualBrief)}` : "");

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "HTML",
      }),
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
