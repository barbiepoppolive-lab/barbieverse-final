// On-demand Meta ad creative generation — callable directly via curl/Postman
// instead of requiring a logged-in admin browser session, since there's no
// admin UI page for this yet. Gated by the same CRON_SECRET already used
// for cron-scrape/cron-content (not a public endpoint).
//
// Usage:
//   curl -X POST https://barbieverse.org/api/public/generate-ad-creative \
//     -H "x-cron-secret: <CRON_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"variantCount": 5}'
//
// Results are delivered to Telegram (copy + image per variant) and logged
// to content_generation_jobs. This does NOT launch any ads — see
// src/lib/ads/meta-marketing.ts for why that's a separate, unfinished step.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/generate-ad-creative")({
  server: {
    handlers: {
      POST: async ({ request }) => handleRequest(request),
    },
  },
});

async function handleRequest(request: Request): Promise<Response> {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { objective?: string; variantCount?: number; qualityThreshold?: number; mode?: "variants" | "carousel"; angle?: string; cardCount?: number } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — use defaults
  }

  try {
    if (body.mode === "carousel") {
      const { generateAdCarousel } = await import("@/lib/ai/modules/ad-creative");
      const result = await generateAdCarousel({
        objective: body.objective,
        angle: body.angle as any,
        cardCount: body.cardCount,
      });

      const { q } = await import("@/lib/db.server");
      await q(
        `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
         VALUES ('ad_carousel', $1, $2, $3, 'draft', $4, NOW())`,
        [`Carousel ad — ${result.angle}`, JSON.stringify(body), JSON.stringify(result), 0.05 * result.cards.length]
      );

      const { sendTelegramImages } = await import("@/lib/social-publish/telegram-media");
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `📣 <b>Carousel ad ready — ${result.angle}</b>\n\n<b>Primary text:</b>\n<code>${result.primary_text}</code>\n\n<b>CTA:</b> ${result.cta}`,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
        for (const card of result.cards) {
          if (card.image_url) {
            await sendTelegramImages({ imageUrl: card.image_url, label: `${card.headline} — ${card.description}` });
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, mode: "carousel", result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { generateAdCreative } = await import("@/lib/ai/modules/ad-creative");
    const result = await generateAdCreative({
      objective: body.objective,
      variantCount: body.variantCount,
      qualityThreshold: body.qualityThreshold,
    });

    const { q } = await import("@/lib/db.server");
    await q(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('ad_creative', $1, $2, $3, 'draft', $4, NOW())`,
      [result.objective.slice(0, 120), JSON.stringify(body), JSON.stringify(result), 0.05 * result.variants.length]
    );

    const { sendTelegramImages } = await import("@/lib/social-publish/telegram-media");
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            `📣 <b>${result.variants.length} Meta ad variants ready</b>\n\n<b>Objective:</b> ${result.objective}\n\n` +
            `Paste each into Ads Manager as a separate ad within one ad set for A/B testing. ` +
            `Reminder: this likely qualifies as a Meta "Special Ad Category" (Employment) — gender-based targeting may be restricted depending on your ad account's country. Check before setting audience targeting.`,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
      for (const v of result.variants) {
        if (v.image_url) {
          await sendTelegramImages({ imageUrl: v.image_url, label: `Angle: ${v.angle}` });
        }
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              `📣 <b>Ad variant — ${v.angle}</b>${v.quality_score ? ` (quality ${v.quality_score}/100)` : ""}\n\n` +
              `<b>Headline:</b> <code>${v.headline}</code>\n\n` +
              `<b>Primary text:</b>\n<code>${v.primary_text}</code>\n\n` +
              `<b>Description:</b> <code>${v.description}</code>\n\n` +
              `<b>CTA button:</b> ${v.cta}`,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ ok: true, mode: "variants", result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
