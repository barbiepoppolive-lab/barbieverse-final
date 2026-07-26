// Shared helper — send a generated image (or carousel of images) to
// Telegram ahead of the caption/text message.
//
// Every manual-delivery path (Moj, Reddit, YouTube-without-video,
// LinkedIn-without-Postiz) was generating an image via image-gen.ts and then
// silently throwing it away — the Telegram message was text-only. That's
// the single biggest reason manually-delivered content looked "generic":
// there was never a photo to go with it, even though one existed.
//
// Telegram's sendPhoto caption field caps at 1024 characters, well short of
// what these captions run (some are 500+ words), so this sends the image on
// its own (short/no caption) and lets the caller send the full caption as a
// separate sendMessage right after — same pattern already used everywhere
// in this app, just now preceded by the actual photo.

function getBotConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

/**
 * Send one image, or multiple as a swipeable album (Telegram media group),
 * ahead of the caption message. Best-effort — a failure here should never
 * block the actual caption/text delivery, so this never throws.
 */
export async function sendTelegramImages(opts: {
  imageUrl?: string;
  imageUrls?: string[];
  label?: string;
}): Promise<void> {
  const config = getBotConfig();
  if (!config) return;

  const urls = opts.imageUrls && opts.imageUrls.length > 0
    ? opts.imageUrls
    : opts.imageUrl
      ? [opts.imageUrl]
      : [];

  if (urls.length === 0) return;

  try {
    if (urls.length === 1) {
      await fetch(`https://api.telegram.org/bot${config.token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          photo: urls[0],
          caption: opts.label || undefined,
        }),
      });
      return;
    }

    // 2+ images — send as an album (max 10 per Telegram's API; this app's
    // carousels top out at 6 slides so that ceiling is never hit).
    await fetch(`https://api.telegram.org/bot${config.token}/sendMediaGroup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        media: urls.slice(0, 10).map((url, i) => ({
          type: "photo",
          media: url,
          ...(i === 0 && opts.label ? { caption: opts.label } : {}),
        })),
      }),
    });
  } catch (e: any) {
    console.warn("[telegram-media] Failed to send image(s), continuing with text-only delivery:", e?.message);
  }
}
