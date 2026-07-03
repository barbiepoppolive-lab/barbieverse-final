// Cron Scrape Endpoint — Called by external cron services (cron-job.org, etc.)
// Set cron to: https://barbieverse.org/api/public/cron-scrape
// Headers: x-cron-secret: <CRON_SECRET from .env>

import { createFileRoute } from "@tanstack/react-router";
import { runScheduledScrapes, autoScoreNewLeads, sendAutomationAlert } from "@/lib/automation/scraper-cron";
import { runOutreachCycle } from "@/lib/automation/outreach-sender";

export const Route = createFileRoute("/api/public/cron-scrape")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify cron secret
        const secret = request.headers.get("x-cron-secret");
        const expectedSecret = process.env.CRON_SECRET;

        if (!expectedSecret || secret !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const results: string[] = [];

        // 1. Run scheduled scrapes
        try {
          const scrapeResult = await runScheduledScrapes();
          results.push(`Scrapes: ${scrapeResult.executed} executed`);
          for (const r of scrapeResult.results) {
            results.push(`  ${r.name}: ${r.resultCount} results${r.error ? ` (${r.error})` : ""}`);
          }
        } catch (err: any) {
          results.push(`Scrapes ERROR: ${err.message}`);
        }

        // 2. Auto-score new leads
        try {
          const scoreResult = await autoScoreNewLeads();
          results.push(`Scoring: ${scoreResult.scored} scored, ${scoreResult.errors} errors`);
        } catch (err: any) {
          results.push(`Scoring ERROR: ${err.message}`);
        }

        // 3. Run outreach cycle
        try {
          const outreachResult = await runOutreachCycle();
          results.push(`Outreach: ${outreachResult.hotNotified} hot notified, digest: ${outreachResult.warmDigest}`);
        } catch (err: any) {
          results.push(`Outreach ERROR: ${err.message}`);
        }

        // 4. Run social media monitoring
        try {
          const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
          const socialResult = await monitorAllPlatforms();
          results.push(`Social: ${socialResult.total} leads (${socialResult.hotAlerts} hot, ${socialResult.warmAlerts} warm)`);
        } catch (err: any) {
          results.push(`Social ERROR: ${err.message}`);
        }

        // Send summary alert to Telegram
        const summary = `🤖 <b>CRON RUN COMPLETE</b>\n\n${results.join("\n")}`;
        await sendAutomationAlert(summary);

        return new Response(JSON.stringify({ ok: true, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },

      POST: async ({ request }) => {
        // Same as GET — support both methods for cron services
        const secret = request.headers.get("x-cron-secret");
        const expectedSecret = process.env.CRON_SECRET;

        if (!expectedSecret || secret !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const results: string[] = [];

        try {
          const scrapeResult = await runScheduledScrapes();
          results.push(`Scrapes: ${scrapeResult.executed} executed`);
        } catch (err: any) {
          results.push(`Scrapes ERROR: ${err.message}`);
        }

        try {
          const scoreResult = await autoScoreNewLeads();
          results.push(`Scoring: ${scoreResult.scored} scored`);
        } catch (err: any) {
          results.push(`Scoring ERROR: ${err.message}`);
        }

        try {
          const outreachResult = await runOutreachCycle();
          results.push(`Outreach: ${outreachResult.hotNotified} hot notified`);
        } catch (err: any) {
          results.push(`Outreach ERROR: ${err.message}`);
        }

        try {
          const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
          const socialResult = await monitorAllPlatforms();
          results.push(`Social: ${socialResult.total} leads (${socialResult.hotAlerts} hot, ${socialResult.warmAlerts} warm)`);
        } catch (err: any) {
          results.push(`Social ERROR: ${err.message}`);
        }

        const summary = `🤖 <b>CRON RUN COMPLETE</b>\n\n${results.join("\n")}`;
        await sendAutomationAlert(summary);

        return new Response(JSON.stringify({ ok: true, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
