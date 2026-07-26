import { runContentCron } from "@/routes/api/public/cron-content";
import { runScrapeCron } from "@/routes/api/public/cron-scrape";

const CRON_CONTENT_INTERVAL = 60 * 60 * 1000; // hourly
const CRON_SCRAPE_INTERVAL = 30 * 60 * 1000; // every 30 min

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  console.log("[scheduler] Starting internal cron scheduler");

  // Content cron — every hour
  setInterval(async () => {
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
  setInterval(async () => {
    console.log("[scheduler] Running scrape cron");
    try {
      const res = await runScrapeCron();
      const body = await res.json();
      console.log("[scheduler] Scrape cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] Scrape cron failed:", err?.message);
    }
  }, CRON_SCRAPE_INTERVAL);

  // Run once immediately on startup (staggered)
  setTimeout(async () => {
    console.log("[scheduler] First content cron run");
    try {
      const res = await runContentCron("internal");
      const body = await res.json();
      console.log("[scheduler] First content cron done:", JSON.stringify(body));
    } catch (err: any) {
      console.error("[scheduler] First content cron failed:", err?.message);
    }
  }, 10_000);

  setTimeout(async () => {
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
