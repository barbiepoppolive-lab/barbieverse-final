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

const STEP_TIMEOUT = 30_000;
const OVERALL_TIMEOUT = 300_000; // 5 minutes (was 90s)

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

  // 2. PHASE 1: Discover — fast, no AI, stores ALL posts (60s timeout)
  let discoveryResult: any = null;
  try {
    const { discoverAllPlatforms } = await import("@/lib/social-monitor/index");
    discoveryResult = await withTimeout(
      discoverAllPlatforms(),
      STEP_TIMEOUT * 2,
      "Discovery"
    );
    results.push(`Discovery: ${discoveryResult.totalDiscovered} found, ${discoveryResult.totalStored} stored`);
    for (const platform of ["youtube", "reddit", "twitter", "facebook", "instagram", "tiktok", "moj"]) {
      const p = discoveryResult[platform];
      if (p) {
        const status = p.skipped ? "SKIPPED" : `${p.found} found, ${p.stored} stored`;
        const error = p.errors > 0 ? ` (${p.errors} errors)` : "";
        results.push(`  ${platform}: ${status}${error}`);
      }
    }
  } catch (err: any) {
    results.push(`Discovery ERROR: ${err.message}`);
  }

  // 3. PHASE 2: Process — AI comments for batch of leads (90s timeout)
  let processResult: any = null;
  try {
    const { processDiscoveredLeads } = await import("@/lib/social-monitor/index");
    processResult = await withTimeout(
      processDiscoveredLeads(20),
      STEP_TIMEOUT * 3,
      "Processing"
    );
    results.push(`Processing: ${processResult.processed} processed (${processResult.hotAlerts} hot, ${processResult.warmAlerts} warm)`);
    results.push(`  Keywords generated: ${processResult.keywordsGenerated}`);
    if (processResult.errors > 0) {
      results.push(`  Errors: ${processResult.errors}`);
    }
  } catch (err: any) {
    results.push(`Processing ERROR: ${err.message}`);
  }

  // 4. Auto-score new leads (quick — DB + AI for up to 20 leads)
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

  // 5. Run outreach cycle (quick — DB query + Telegram alerts)
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

  // 6. PHASE 3: Evolve keywords (15s timeout)
  try {
    const { evolveKeywords } = await import("@/lib/social-monitor/keyword-intel");
    const evoResult = await withTimeout(
      evolveKeywords(),
      15_000,
      "Evolution"
    );
    results.push(`Evolution: ${evoResult.promoted} promoted, ${evoResult.demoted} demoted, ${evoResult.retired} retired`);
  } catch (err: any) {
    results.push(`Evolution ERROR: ${err.message}`);
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
