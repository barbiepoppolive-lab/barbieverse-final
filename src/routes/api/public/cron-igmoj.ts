// Scheduled Instagram → Moj-creator discovery
// URL:     https://barbieverse.org/api/public/cron-igmoj
// Headers: x-cron-secret: <CRON_SECRET>
//
// This is the workhorse of the recruitment funnel — unlike the Moj crawler
// it needs no seeds and every lead it produces is reachable by DM.
//
// Cadence: once a day is plenty. Apify credits are the real constraint (the
// free tier is ~$5/month), and the hashtag pool doesn't turn over fast
// enough to justify more. Duplicates are skipped by post URL, so a daily
// run mostly surfaces genuinely new creators.

import { createFileRoute } from "@tanstack/react-router";
import { runInstagramMojPipeline } from "@/lib/automation/instagram-moj-pipeline";

let runInProgress = false;
let runStartedAt = 0;
const LOCK_STALE_MS = 30 * 60 * 1000;

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
    console.error("[cron-igmoj] Telegram alert failed:", err);
  }
}

export const Route = createFileRoute("/api/public/cron-igmoj")({
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

  if (runInProgress && Date.now() - runStartedAt < LOCK_STALE_MS) {
    return new Response(JSON.stringify({ ok: false, skipped: "already running" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  runInProgress = true;
  runStartedAt = Date.now();

  try {
    const result = await runInstagramMojPipeline();

    // The pipeline reports its own detail. Only escalate the silent-failure
    // case, which for this channel almost always means Apify credits ran out.
    if (result.postsScanned === 0) {
      await sendAlert(
        `📸 <b>INSTAGRAM RUN — NOTHING SCANNED</b>\n\n` +
        (result.warnings.length
          ? result.warnings.map((w) => `⚠️ ${w}`).join("\n")
          : `No posts came back. Most likely: Apify credits exhausted, or APIFY_TOKEN is invalid.`)
      );
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await sendAlert(`📸 <b>INSTAGRAM RUN FAILED</b>\n\n${err.message}`);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    runInProgress = false;
  }
}
