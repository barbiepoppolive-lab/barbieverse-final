// Scheduled Content Publishing — Called by external cron (cron-job.org, etc.)
// Set cron to: https://barbieverse.org/api/public/cron-content
// Headers: x-cron-secret: <CRON_SECRET from .env> (same secret as cron-scrape)
//
// Rotates through a fixed set of credibility-building topics (same core
// ideas as LAUNCH-CONTENT-BATCH.md) so a scheduled run always has something
// concrete to generate, without needing a human to supply a topic each time.

import { createFileRoute } from "@tanstack/react-router";
import { runContentCycle } from "@/lib/social-publish";
import { generateImage } from "@/lib/ai/image-gen";

const TOPIC_ROTATION = [
  "Barbie's founder credentials — highest Wealth Level Poppo/Vone creator worldwide, why that matters for new creators",
  "How to join Barbieverse and start streaming — the 3-step process, no audience needed",
  "The first week guarantee — ₹1,150 (female) / ₹575 (male) for streaming 2 hours a day for 7 days",
  "Realistic earnings breakdown for Poppo/Vone hosts — week one, month one, and consistent streamers",
  "Myth-busting: you do NOT need existing followers to start earning on live streaming",
  "BarbieVerse Academy — free lessons on coins, points, PK battles, and withdrawals for new creators",
  "Trust and safety — why Barbieverse never asks for your password, only your Poppo/Vone User ID",
  "What makes Barbieverse different — hosted with heart, paid on time, treated like talent",
];

async function getNextTopicIndex(): Promise<number> {
  const { q } = await import("@/lib/db.server");
  const rows = await q<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'content_cron_topic_index'`
  );
  const current = rows[0]?.value ? parseInt(rows[0].value, 10) : 0;
  const next = (current + 1) % TOPIC_ROTATION.length;
  await q(
    `INSERT INTO settings (key, value) VALUES ('content_cron_topic_index', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(next)]
  );
  return current;
}

// Fixed character/style descriptor so every auto-generated post uses a
// consistent look — matches the "always seed 123456789, same prompt
// structure" consistency rule from CONTENT-STRATEGY.md.
const BARBIE_IMAGE_STYLE =
  "professional portrait of a confident young Indian woman content creator, " +
  "warm friendly smile, modern streaming setup with pink and purple neon " +
  "accent lighting in the background, elegant casual outfit, soft studio " +
  "lighting, high detail, photorealistic, Instagram aesthetic";
const BARBIE_IMAGE_SEED = 123456789;

async function buildTopicImage(topic: string): Promise<string | undefined> {
  try {
    const result = await generateImage({
      prompt: `${BARBIE_IMAGE_STYLE}. Scene relates to: ${topic}`,
      size: "portrait",
      seed: BARBIE_IMAGE_SEED,
      provider: "auto",
    });
    // ComfyUI returns a path relative to /public (e.g. "/generated-videos/x.png"),
    // which only resolves once this app's own domain serves it back — turn it
    // into an absolute URL so Graph API / LinkedIn can actually fetch it.
    // Pollinations already returns a full https:// URL, so this is a no-op then.
    if (result.url.startsWith("http")) return result.url;
    const base = process.env.PUBLIC_APP_URL;
    if (!base) {
      console.warn("[cron-content] Image generated at a relative path but PUBLIC_APP_URL is unset — platforms won't be able to fetch it");
      return undefined;
    }
    return `${base.replace(/\/$/, "")}${result.url}`;
  } catch (e: any) {
    console.error("[cron-content] Image generation failed, continuing without an image:", e?.message);
    return undefined;
  }
}

async function sendAlert(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[cron-content] Telegram alert failed:", err);
  }
}

export const Route = createFileRoute("/api/public/cron-content")({
  server: {
    handlers: {
      GET: async ({ request }) => handleCron(request),
      POST: async ({ request }) => handleCron(request),
    },
  },
});

async function handleCron(request: Request): Promise<Response> {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const topicIndex = await getNextTopicIndex();
    const topic = TOPIC_ROTATION[topicIndex];

    // Generate a brand-consistent image up front so Instagram/Facebook/
    // LinkedIn get a real visual instead of reporting "skipped" for lack of
    // one. Falls back to undefined (posts continue text-only where that's
    // possible) if generation fails for any reason.
    const imageUrl = await buildTopicImage(topic);

    const results = await runContentCycle({ topic, imageUrl });

    let summary = `🤖 <b>SCHEDULED CONTENT RUN</b>\n\n<b>Topic:</b> ${topic}\n<b>Image:</b> ${imageUrl ? "✅ generated" : "⚠️ none (generation failed)"}\n\n`;
    for (const r of results) {
      const emoji = r.status === "published" ? "✅" : r.status === "sent_for_manual" ? "📲" : r.status === "needs_review" ? "⚠️" : r.status === "skipped" ? "⏭️" : "❌";
      summary += `${emoji} ${r.platform}: ${r.status}${r.error ? ` (${r.error})` : ""}\n`;
    }
    await sendAlert(summary);

    return new Response(JSON.stringify({ ok: true, topic, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await sendAlert(`🤖 <b>SCHEDULED CONTENT RUN FAILED</b>\n\n${err.message}`);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
