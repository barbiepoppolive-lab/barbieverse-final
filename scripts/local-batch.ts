/**
 * Local batch generator — run this on the machine with the GPU.
 *
 * ── Why ─────────────────────────────────────────────────────────────────
 * Railway can't reach ComfyUI (it's on your PC, not Railway's network), so
 * every cloud-generated image silently falls back to Pollinations free flux.
 * Rather than exposing your GPU to the internet through a tunnel that expires
 * on every reboot, this inverts the flow: generate here, push finished posts
 * to Postiz with a future publish time, and let Postiz do the posting. Your
 * machine only has to be awake for the batch, not at post time.
 *
 * ── Usage ───────────────────────────────────────────────────────────────
 *   npx tsx scripts/local-batch.ts              # dry run, generates nothing
 *   npx tsx scripts/local-batch.ts --commit     # actually generate + schedule
 *   npx tsx scripts/local-batch.ts --commit --days 7
 *
 * Dry run is the default on purpose — it shows you exactly which calendar
 * rows would be processed before spending GPU time or touching Postiz.
 *
 * ── Prerequisites ───────────────────────────────────────────────────────
 *   - ComfyUI running locally (checked before anything else happens)
 *   - POSTIZ_API_KEY + the four *_INTEGRATION_ID vars in .env
 *   - Database credentials in .env (same ones the app uses)
 *
 * ── Important ───────────────────────────────────────────────────────────
 * Disable the Railway content cron before using this regularly, or both will
 * process the same calendar rows and you'll double-post.
 */

import "dotenv/config";

// Force local ComfyUI regardless of what .env says. This script is pointless
// otherwise — the entire reason it exists is to use the local GPU.
process.env.COMFYUI_BASE_URL = process.env.LOCAL_COMFYUI_URL || "http://127.0.0.1:8188";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const DAYS = Number(args[args.indexOf("--days") + 1]) || 3;

/** Spread posts across the day rather than dumping them at one timestamp. */
const SLOT_HOURS = [10, 13, 16, 20];

interface Row {
  id: string;
  platform: string;
  content_type: string;
  topic: string;
  date: string;
  scheduled_for: string | null;
}

async function comfyReachable(): Promise<boolean> {
  const url = process.env.COMFYUI_BASE_URL!;
  try {
    const res = await fetch(`${url}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * When should this row publish? Prefer the calendar's own slot; otherwise
 * spread across SLOT_HOURS. Always at least 10 minutes out — Postiz rejects
 * `type: "schedule"` with a past or immediate date, which is what made an
 * earlier attempt at scheduling fail with a 400.
 */
function publishTimeFor(row: Row, indexWithinDay: number): Date {
  if (row.scheduled_for) {
    const d = new Date(row.scheduled_for);
    if (d.getTime() > Date.now() + 10 * 60_000) return d;
  }
  const d = new Date(row.date);
  d.setHours(SLOT_HOURS[indexWithinDay % SLOT_HOURS.length], 0, 0, 0);
  const floor = Date.now() + 10 * 60_000;
  return d.getTime() < floor ? new Date(floor) : d;
}

async function main() {
  console.log(`\nLocal batch — ${COMMIT ? "COMMIT" : "DRY RUN"}, next ${DAYS} day(s)\n`);

  console.log(`ComfyUI: ${process.env.COMFYUI_BASE_URL}`);
  if (!(await comfyReachable())) {
    console.error(
      `\nFAIL  ComfyUI is not reachable.\n` +
        `      Start it, or set LOCAL_COMFYUI_URL if it's on a different port.\n` +
        `      Refusing to run — falling back to Pollinations is exactly what\n` +
        `      this script exists to avoid.\n`,
    );
    process.exit(1);
  }
  console.log("ComfyUI: reachable\n");

  if (!process.env.POSTIZ_API_KEY) {
    console.error("FAIL  POSTIZ_API_KEY not set. Run: npm run check:postiz\n");
    process.exit(1);
  }

  const { q } = await import("../src/lib/db.server");
  const rows = await q<Row>(
    `SELECT id, platform, content_type, topic, date::text AS date, scheduled_for
       FROM content_calendar
      WHERE status = 'draft'
        AND date >= CURRENT_DATE
        AND date < CURRENT_DATE + ($1::int * INTERVAL '1 day')
      ORDER BY date, scheduled_for NULLS FIRST, platform`,
    [DAYS],
  );

  if (rows.length === 0) {
    console.log("No draft calendar rows in range. Nothing to do.\n");
    return;
  }

  console.log(`${rows.length} row(s) to process:\n`);
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const n = perDay.get(r.date) ?? 0;
    perDay.set(r.date, n + 1);
    const when = publishTimeFor(r, n);
    console.log(
      `  ${r.date}  ${r.platform.padEnd(10)} ${r.content_type.padEnd(13)} ` +
        `→ ${when.toISOString()}  ${r.topic.slice(0, 52)}`,
    );
  }

  if (!COMMIT) {
    console.log(`\nDry run — nothing generated, nothing scheduled.`);
    console.log(`Re-run with --commit to execute.\n`);
    return;
  }

  const { generateImage } = await import("../src/lib/ai/image-gen");
  const { toPublicImageUrl } = await import("../src/lib/social-publish/postiz-upload");
  const { generateAndPublish } = await import("../src/lib/social-publish");
  const { seedFromString, personaForTopic, imageStyleFor } = await import(
    "../src/lib/ai/image-persona"
  );

  const counts = { published: 0, needs_review: 0, failed: 0, skipped: 0 };
  const seen = new Map<string, number>();

  for (const row of rows) {
    const n = seen.get(row.date) ?? 0;
    seen.set(row.date, n + 1);
    const when = publishTimeFor(row, n);

    console.log(`\n─ ${row.platform} · ${row.topic.slice(0, 60)}`);

    let imageUrl: string | undefined;
    if (row.content_type !== "carousel") {
      try {
        const t0 = Date.now();
        const img = await generateImage({
          prompt: `${imageStyleFor(personaForTopic(row.topic))}. Scene relates to: ${row.topic}`,
          size: "portrait",
          seed: seedFromString(row.topic),
          provider: "comfyui", // never silently fall back — that's the bug
        });
        console.log(`  image: ${img.provider} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        imageUrl = await toPublicImageUrl(img);
        if (!imageUrl) console.log("  image: upload failed, posting without one");
      } catch (e: any) {
        console.error(`  image FAILED: ${e?.message}`);
      }
    }

    try {
      const result = await generateAndPublish({
        platform: row.platform as any,
        topic: row.topic,
        contentType: row.content_type,
        imageUrl,
        scheduledAt: when.toISOString(),
      } as any);

      counts[result.status as keyof typeof counts] =
        (counts[result.status as keyof typeof counts] ?? 0) + 1;
      console.log(`  ${result.status}${result.error ? ` — ${result.error}` : ""}`);

      if (result.status === "published") {
        await q(
          `UPDATE content_calendar SET status = 'scheduled', updated_at = NOW() WHERE id = $1`,
          [row.id],
        );
      }
    } catch (e: any) {
      counts.failed++;
      console.error(`  FAILED: ${e?.message}`);
    }
  }

  console.log(
    `\nDone. scheduled=${counts.published} needs_review=${counts.needs_review} ` +
      `failed=${counts.failed} skipped=${counts.skipped}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
