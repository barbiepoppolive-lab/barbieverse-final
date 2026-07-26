// Scheduled Content Publishing — Called by external cron (cron-job.org, etc.)
// Set cron to: https://barbieverse.org/api/public/cron-content
// Headers: x-cron-secret: <CRON_SECRET from .env> (same secret as cron-scrape)
//
// Pulls today's rows from the content_calendar table (date, platform,
// content_type, topic) — this is the 30-day campaign seeded on 2026-07-25,
// covering Instagram/Facebook/LinkedIn/YouTube/Reddit/Moj with a rotating
// mix of carousels, stories, and single posts across trust, education,
// lifestyle, recruitment, and community pillars. Deliberately excludes any
// coin-selling content (see also the runtime guard in social-publish/index.ts).
//
// Falls back to a small fixed topic rotation if the calendar has no rows
// for today (e.g. the 30-day plan ran out and hasn't been extended yet) —
// so the pipeline degrades gracefully instead of going silent.

import { createFileRoute } from "@tanstack/react-router";
import { generateAndPublish, type PublishPlatform } from "@/lib/social-publish";
import { generateImage } from "@/lib/ai/image-gen";

const FALLBACK_TOPIC_ROTATION = [
  "Barbie's founder credentials — highest Wealth Level Poppo/Vone creator worldwide, why that matters for new creators",
  "How to join Barbieverse and start streaming — the 3-step process, no audience needed",
  "The first week guarantee — ₹1,150 (female) / ₹575 (male) for streaming 2 hours a day for 7 days",
  "Realistic earnings breakdown for Poppo/Vone hosts — week one, month one, and consistent creators",
  "Myth-busting: you do NOT need existing followers to start earning on live streaming",
  "BarbieVerse Academy — free lessons on coins, points, PK battles, and withdrawals for new creators",
  "Trust and safety — why Barbieverse never asks for your password, only your Poppo/Vone User ID",
  "What makes Barbieverse different — hosted with heart, paid on time, treated like talent",
];
const FALLBACK_PLATFORMS: PublishPlatform[] = ["facebook", "instagram", "moj", "youtube", "linkedin"];

interface CalendarRow {
  id: string;
  platform: string;
  content_type: string;
  topic: string;
}

async function getTodaysCalendarRows(): Promise<CalendarRow[]> {
  const { q } = await import("@/lib/db.server");
  // Only rows whose scheduled_for has actually arrived (or has none set, for
  // older/simple rows that don't carry a time). Without this filter, a
  // once-daily cron call dumps every row for today in one shot regardless of
  // the 13:00/16:00/20:00/22:30 slots set on the Moj 4x/day rows — this is
  // what makes calling this endpoint hourly actually behave like a spaced-out
  // daily schedule instead of one big burst.
  return q<CalendarRow>(
    `SELECT id, platform, content_type, topic FROM content_calendar
     WHERE date = CURRENT_DATE AND status = 'draft'
       AND (scheduled_for IS NULL OR scheduled_for <= NOW())
     ORDER BY scheduled_for NULLS FIRST, platform`
  );
}

async function markCalendarRow(id: string, status: "published" | "scheduled" | "failed"): Promise<void> {
  try {
    const { q } = await import("@/lib/db.server");
    await q(`UPDATE content_calendar SET status = $2, updated_at = NOW() WHERE id = $1`, [id, status]);
  } catch (e: any) {
    console.error("[cron-content] Failed to update content_calendar row:", e?.message);
  }
}

async function getFallbackTopicIndex(): Promise<number> {
  const { q } = await import("@/lib/db.server");
  const rows = await q<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'content_cron_topic_index'`
  );
  const current = rows[0]?.value ? parseInt(rows[0].value, 10) : 0;
  const next = (current + 1) % FALLBACK_TOPIC_ROTATION.length;
  await q(
    `INSERT INTO settings (key, value) VALUES ('content_cron_topic_index', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(next)]
  );
  return current;
}

// Consistent VISUAL STYLE (lighting, setup, aesthetic) across every
// auto-generated post — but NOT a fixed seed and NOT a fixed gender. Both of
// those were bugs, not features:
//   - A fixed seed (123456789) on every single call, for every topic, across
//     the whole 30-day campaign, made most generated images near-duplicates
//     of each other regardless of what the post was actually about — a big
//     part of why the content read as "generic."
//   - The persona was hardcoded to "young Indian woman" unconditionally, so
//     even topics explicitly about male creators (e.g. "a male host's
//     perspective") still generated a photo of a woman.
// Fix: derive the seed from the topic text (reproducible per-topic, but
// distinct across topics), and pick the persona from the topic's own
// language when it specifies a gender, falling back to an even split for
// gender-neutral topics so the campaign's imagery actually reflects a mixed
// creator base instead of defaulting to one gender every time.

function seedFromString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function personaForTopic(topic: string): string {
  const lower = topic.toLowerCase();
  if (/\bmale\b|\bmale host\b|\bmale creator\b|\bmale perspective\b|\(male\)/.test(lower)) {
    return "confident young Indian man";
  }
  if (/\bfemale\b|\bshe\b|\bher\b|\(female\)/.test(lower)) {
    return "confident young Indian woman";
  }
  // Gender-neutral topic — split deterministically by topic hash instead of
  // defaulting to one gender every time.
  return seedFromString(topic) % 2 === 0 ? "confident young Indian woman" : "confident young Indian man";
}

function imageStyleFor(persona: string): string {
  return (
    `professional portrait of a ${persona} content creator, ` +
    "warm friendly smile, modern streaming setup with pink and purple neon " +
    "accent lighting in the background, elegant casual outfit, soft studio " +
    "lighting, high detail, photorealistic, Instagram aesthetic"
  );
}

async function buildTopicImage(topic: string): Promise<string | undefined> {
  try {
    const style = imageStyleFor(personaForTopic(topic));
    const result = await generateImage({
      prompt: `${style}. Scene relates to: ${topic}`,
      size: "portrait",
      seed: seedFromString(topic),
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

function statusEmoji(status: string): string {
  if (status === "published") return "✅";
  if (status === "sent_for_manual") return "📲";
  if (status === "needs_review") return "⚠️";
  if (status === "skipped") return "⏭️";
  return "❌";
}

function calendarStatusFor(status: string): "published" | "scheduled" | "failed" {
  if (status === "published") return "published";
  if (status === "sent_for_manual") return "scheduled";
  return "failed"; // needs_review, skipped, or an actual failure — all mean "didn't go out clean today"
}

async function handleCron(request: Request): Promise<Response> {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const calendarRows = await getTodaysCalendarRows();

    if (calendarRows.length > 0) {
      // Campaign mode: one or more platform-specific rows for today, each
      // with its own topic and content type (carousel/story/social_post).
      let summary = `🤖 <b>SCHEDULED CONTENT RUN — Campaign</b>\n\n`;
      const results: { platform: string; status: string; error?: string }[] = [];

      for (const row of calendarRows) {
        const imageUrl = row.content_type === "carousel" ? undefined : await buildTopicImage(row.topic);
        try {
          const result = await generateAndPublish({
            platform: row.platform as PublishPlatform,
            topic: row.topic,
            contentType: row.content_type,
            imageUrl,
          });
          await markCalendarRow(row.id, calendarStatusFor(result.status));
          results.push(result);
          summary += `${statusEmoji(result.status)} ${row.platform} (${row.content_type}): ${result.status}${result.error ? ` — ${result.error}` : ""}\n`;
        } catch (e: any) {
          await markCalendarRow(row.id, "failed");
          results.push({ platform: row.platform, status: "failed", error: e?.message });
          summary += `❌ ${row.platform} (${row.content_type}): failed — ${e?.message}\n`;
        }
      }

      await sendAlert(summary);
      return new Response(JSON.stringify({ ok: true, mode: "campaign", results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fallback mode: no calendar rows for today (before the campaign starts,
    // after it ends, or if it's paused) — keep the pipeline alive with the
    // original fixed rotation across the default platform set.
    const topicIndex = await getFallbackTopicIndex();
    const topic = FALLBACK_TOPIC_ROTATION[topicIndex];
    const imageUrl = await buildTopicImage(topic);

    const { runContentCycle } = await import("@/lib/social-publish");
    const results = await runContentCycle({ topic, imageUrl, platforms: FALLBACK_PLATFORMS });

    let summary = `🤖 <b>SCHEDULED CONTENT RUN — Fallback (no calendar rows today)</b>\n\n<b>Topic:</b> ${topic}\n\n`;
    for (const r of results) {
      summary += `${statusEmoji(r.status)} ${r.platform}: ${r.status}${r.error ? ` (${r.error})` : ""}\n`;
    }
    await sendAlert(summary);

    return new Response(JSON.stringify({ ok: true, mode: "fallback", topic, results }), {
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
