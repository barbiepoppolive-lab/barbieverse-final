// Scheduled Moj Recruitment Crawl — called by external cron (cron-job.org)
// URL:     https://barbieverse.org/api/public/cron-moj
// Headers: x-cron-secret: <CRON_SECRET>
//
// Separate from cron-scrape on purpose. The Moj crawl is slow (it walks a
// page graph with a polite delay between fetches) and its output needs
// different handling — contact routing and a manual comment queue rather
// than the generic comment-generation path the other platforms use.
// Bundling it into the multi-platform run meant it either got starved or
// blew the request budget for everything else.
//
// Suggested cadence: once or twice a day. More often mostly re-discovers the
// same creators, and the per-URL dedupe will just report them as "already
// seen" while still spending the crawl budget.

import { createFileRoute } from "@tanstack/react-router";
import { runMojPipeline } from "@/lib/automation/moj-pipeline";

// Guard against overlapping runs — a crawl can outlive the cron interval.
let runInProgress = false;
let runStartedAt = 0;
const LOCK_STALE_MS = 30 * 60 * 1000; // 30 min

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
    console.error("[cron-moj] Telegram alert failed:", err);
  }
}

export const Route = createFileRoute("/api/public/cron-moj")({
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
    return new Response(
      JSON.stringify({ ok: false, skipped: "run already in progress" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  runInProgress = true;
  runStartedAt = Date.now();

  try {
    const result = await runMojPipeline();

    // The pipeline already sends its own detailed Telegram report. Only
    // escalate here when the run produced nothing usable, since that's the
    // failure mode that previously went unnoticed for weeks.
    if (result.candidates === 0) {
      await sendAlert(
        `🎯 <b>MOJ CRAWL — NO CANDIDATES</b>\n\n` +
        `Crawled ${result.crawled} pages, parser: ${result.parserUsed}.\n` +
        (result.warnings.length
          ? result.warnings.map((w) => `⚠️ ${w}`).join("\n")
          : `No warnings — the crawl ran clean but nothing cleared the fit threshold. Consider better seeds or a lower moj_min_fit_score.`)
      );
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await sendAlert(`🎯 <b>MOJ CRAWL FAILED</b>\n\n${err.message}`);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    runInProgress = false;
  }
}
