import { runContentCron } from "@/routes/api/public/cron-content";
import { runScrapeCron } from "@/routes/api/public/cron-scrape";
import { runWhatsappFollowUps } from "@/routes/api/public/cron-whatsapp";

const CRON_CONTENT_INTERVAL = 60 * 60 * 1000; // hourly
const CRON_SCRAPE_INTERVAL = 30 * 60 * 1000; // every 30 min
const CRON_WHATSAPP_INTERVAL = 15 * 60 * 1000; // every 15 min

let started = false;

/**
 * Whether the in-process content cron may run.
 *
 * Set CONTENT_CRON_ENABLED=false when generating content locally via
 * scripts/local-batch.ts. Both read the same `content_calendar` rows, so
 * leaving this on means the server races the local batch and you get
 * duplicate posts.
 *
 * Defaults to enabled, so existing deployments are unaffected.
 */
function contentCronEnabled(): boolean {
  return (process.env.CONTENT_CRON_ENABLED ?? "true").toLowerCase() !== "false";
}

/** Same switch for the scrape cron, kept independent — you may want lead
 *  discovery running on the server even while content is generated locally. */
function scrapeCronEnabled(): boolean {
  return (process.env.SCRAPE_CRON_ENABLED ?? "true").toLowerCase() !== "false";
}

/**
 * WhatsApp follow-ups. Defaults to OFF — this one sends real messages to real
 * people, so it must be switched on deliberately (WA_FOLLOWUP_ENABLED=true)
 * and never by inheriting a default.
 *
 * Note this is outbound only: it needs the AiSensy Project API key and nothing
 * else. It does not depend on the inbound webhook, which is why it can run
 * while the webhook question is still open.
 */
function whatsappCronEnabled(): boolean {
  return (process.env.WA_FOLLOWUP_ENABLED ?? "false").toLowerCase() === "true";
}

export function startScheduler(): void {
  if (started) return;
  started = true;

  console.log(
    `[scheduler] Starting internal cron scheduler ` +
      `(content=${contentCronEnabled() ? "on" : "OFF"}, scrape=${scrapeCronEnabled() ? "on" : "OFF"}` +
      `, whatsapp=${whatsappCronEnabled() ? "on" : "OFF"})`,
  );

  // Content cron — every hour
  if (contentCronEnabled()) setInterval(async () => {
    console.log("[scheduler] Running content cron");
    try {
      const res = await runContentCron("internal");
      const body = await res.json();
      console.log("[scheduler] Content cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] Content cron failed:", err?.message);
    }
  }, CRON_CONTENT_INTERVAL);

  // Scrape cron — every 30 min
  if (scrapeCronEnabled()) setInterval(async () => {
    console.log("[scheduler] Running scrape cron");
    try {
      const res = await runScrapeCron();
      const body = await res.json();
      console.log("[scheduler] Scrape cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] Scrape cron failed:", err?.message);
    }
  }, CRON_SCRAPE_INTERVAL);

  // WhatsApp follow-ups — every 15 min. The engine itself caps each run at 4
  // sends with a randomised gap, and refuses to send outside 9AM-11PM IST.
  if (whatsappCronEnabled()) setInterval(async () => {
    try {
      const out = await runWhatsappFollowUps();
      console.log("[scheduler] WhatsApp follow-ups:", JSON.stringify(out));
    } catch (err: any) {
      console.error("[scheduler] WhatsApp follow-ups failed:", err?.message);
    }
  }, CRON_WHATSAPP_INTERVAL);

  // Run once immediately on startup (staggered)
  if (contentCronEnabled()) setTimeout(async () => {
    console.log("[scheduler] First content cron run");
    try {
      const res = await runContentCron("internal");
      const body = await res.json();
      console.log("[scheduler] First content cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] First content cron failed:", err?.message);
    }
  }, 10_000);

  // First WhatsApp run shortly after boot, so a restart resumes the queue
  // instead of idling for a full interval. Staggered after the others.
  if (whatsappCronEnabled()) setTimeout(async () => {
    try {
      const out = await runWhatsappFollowUps();
      console.log("[scheduler] First WhatsApp follow-up run:", JSON.stringify(out));
    } catch (err: any) {
      console.error("[scheduler] First WhatsApp run failed:", err?.message);
    }
  }, 30_000);

  if (scrapeCronEnabled()) setTimeout(async () => {
    console.log("[scheduler] First scrape cron run");
    try {
      const res = await runScrapeCron();
      const body = await res.json();
      console.log("[scheduler] First scrape cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] First scrape cron failed:", err?.message);
    }
  }, 20_000);
}
