// Cron Scrape Endpoint — Called by external cron services (cron-job.org, etc.)
// Set cron to: https://barbieverse.org/api/public/cron-scrape
// Headers: x-cron-secret: <CRON_SECRET from .env>

import { createFileRoute } from "@tanstack/react-router";
import { runScheduledScrapes, autoScoreNewLeads, sendAutomationAlert } from "@/lib/automation/scraper-cron";
import { runOutreachCycle } from "@/lib/automation/outreach-sender";

// ── Timeout helper ──────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const STEP_TIMEOUT = 30_000; // 30s per step
const OVERALL_TIMEOUT = 90_000; // 90s total

export const Route = createFileRoute("/api/public/cron-scrape")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return handleCron(request);
      },
      POST: async ({ request }) => {
        return handleCron(request);
      },
    },
  },
});

async function handleCron(request: Request): Promise<Response> {
  const startTime = Date.now();

  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: string[] = [];

  // Overall timeout wrapper
  const overallTimer = setTimeout(() => {
    results.push(`⚠️ OVERALL TIMEOUT — partial results returned`);
  }, OVERALL_TIMEOUT);

  // 1. Run scheduled scrapes (quick — just checks schedule table)
  try {
    const scrapeResult = await withTimeout(
      runScheduledScrapes(),
      STEP_TIMEOUT,
      "Scrapes"
    );
    results.push(`Scrapes: ${scrapeResult.executed} executed`);
    for (const r of scrapeResult.results) {
      results.push(`  ${r.name}: ${r.resultCount} results${r.error ? ` (${r.error})` : ""}`);
    }
  } catch (err: any) {
    results.push(`Scrapes ERROR: ${err.message}`);
  }

  // 2. Auto-score new leads (quick — DB + AI for up to 20 leads)
  try {
    const scoreResult = await withTimeout(
      autoScoreNewLeads(),
      STEP_TIMEOUT,
      "Scoring"
    );
    results.push(`Scoring: ${scoreResult.scored} scored, ${scoreResult.errors} errors`);
  } catch (err: any) {
    results.push(`Scoring ERROR: ${err.message}`);
  }

  // 3. Run outreach cycle (quick — DB query + Telegram alerts)
  try {
    const outreachResult = await withTimeout(
      runOutreachCycle(),
      STEP_TIMEOUT,
      "Outreach"
    );
    results.push(`Outreach: ${outreachResult.hotNotified} hot notified, digest: ${outreachResult.warmDigest}`);
  } catch (err: any) {
    results.push(`Outreach ERROR: ${err.message}`);
  }

  // 4. Run social media monitoring (HEAVIEST — has per-platform timeouts)
  try {
    const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
    const socialResult = await withTimeout(
      monitorAllPlatforms(),
      STEP_TIMEOUT * 3, // 90s for social (Facebook/Instagram actors can take 60s each, but they run in parallel)
      "Social"
    );
    results.push(`Social: ${socialResult.total} total leads (${socialResult.hotAlerts} hot, ${socialResult.warmAlerts} warm)`);
    results.push(`  YouTube: ${socialResult.youtube.found} found, ${socialResult.youtube.stored} stored${socialResult.youtube.skipped ? " (SKIPPED - interval)" : ""}`);
    results.push(`  Reddit: ${socialResult.reddit.found} found, ${socialResult.reddit.stored} stored${socialResult.reddit.skipped ? " (SKIPPED - interval)" : ""}`);
    results.push(`  Twitter: ${socialResult.twitter.found} found, ${socialResult.twitter.stored} stored${socialResult.twitter.skipped ? " (SKIPPED - interval)" : ""}`);
    results.push(`  Facebook: ${socialResult.facebook.found} found, ${socialResult.facebook.stored} stored${socialResult.facebook.skipped ? " (SKIPPED - interval)" : ""}`);
    results.push(`  Instagram: ${socialResult.instagram.found} found, ${socialResult.instagram.stored} stored${socialResult.instagram.skipped ? " (SKIPPED - interval)" : ""}`);
  } catch (err: any) {
    results.push(`Social ERROR: ${err.message}`);
  }

  clearTimeout(overallTimer);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  results.unshift(`⏱️ Completed in ${elapsed}s`);

  // Send summary alert to Telegram
  const summary = `🤖 <b>CRON RUN COMPLETE</b> (${elapsed}s)\n\n${results.join("\n")}`;
  await sendAutomationAlert(summary);

  return new Response(JSON.stringify({ ok: true, elapsed: `${elapsed}s`, results }), {
    headers: { "Content-Type": "application/json" },
  });
}
