// Meta Ads Creative — server functions to generate ad copy/visuals and
// deliver them to Telegram, ready to paste into Meta Ads Manager.
//
// This does NOT launch ads. There's no admin UI page for this yet either —
// Telegram delivery was the fastest way to get usable output in front of
// you without building a new panel first. Call generateAndDeliverAdCreative
// from anywhere authenticated (or trigger it manually) and check Telegram.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function deliverVariantsToTelegram(objective: string, variants: Array<{
  angle: string; headline: string; primary_text: string; description: string;
  cta: string; image_url?: string; quality_score?: number;
}>) {
  const { sendTelegramImages } = await import("../social-publish/telegram-media");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return { delivered: false, reason: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured" };

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `📣 <b>${variants.length} Meta ad variants ready</b>\n\n<b>Objective:</b> ${escapeHtml(objective)}\n\nPaste each into Ads Manager as a separate ad within one ad set for A/B testing. Remember: this campaign likely qualifies as a Meta "Special Ad Category" (Employment) — gender-based audience targeting may be restricted or blocked depending on your ad account's country. Check this before setting targeting.`,
      parse_mode: "HTML",
    }),
  }).catch(() => {});

  for (const v of variants) {
    if (v.image_url) {
      await sendTelegramImages({ imageUrl: v.image_url, label: `Angle: ${v.angle}` });
    }
    const text =
      `📣 <b>Ad variant — ${escapeHtml(v.angle)}</b>${v.quality_score ? ` (quality ${v.quality_score}/100)` : ""}\n\n` +
      `<b>Headline:</b> <code>${escapeHtml(v.headline)}</code>\n\n` +
      `<b>Primary text:</b>\n<code>${escapeHtml(v.primary_text)}</code>\n\n` +
      `<b>Description:</b> <code>${escapeHtml(v.description)}</code>\n\n` +
      `<b>CTA button:</b> ${escapeHtml(v.cta)}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    }).catch(() => {});
  }

  return { delivered: true };
}

// ── Generate a batch of single-image ad variants (one per angle) ──

export const generateAndDeliverAdCreative = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          objective: z.string().optional(),
          variantCount: z.number().min(1).max(5).default(5),
          qualityThreshold: z.number().min(0).max(100).default(65),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateAdCreative } = await import("../ai/modules/ad-creative");
    const result = await generateAdCreative({
      objective: data.objective,
      variantCount: data.variantCount,
      qualityThreshold: data.qualityThreshold,
    });

    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('ad_creative', $1, $2, $3, 'draft', $4, NOW())
       RETURNING *`,
      [result.objective.slice(0, 120), JSON.stringify(data), JSON.stringify(result), 0.05 * result.variants.length]
    );

    const delivery = await deliverVariantsToTelegram(result.objective, result.variants);

    return { job, result, delivery };
  });

// ── Generate one carousel ad for a chosen angle ──

export const generateAndDeliverAdCarousel = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          objective: z.string().optional(),
          angle: z
            .enum(["earnings_transparency", "flexibility_no_experience", "creator_testimonial", "trust_safety", "community_support"])
            .optional(),
          cardCount: z.number().min(2).max(10).default(4),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateAdCarousel } = await import("../ai/modules/ad-creative");
    const result = await generateAdCarousel({
      objective: data.objective,
      angle: data.angle,
      cardCount: data.cardCount,
    });

    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('ad_carousel', $1, $2, $3, 'draft', $4, NOW())
       RETURNING *`,
      [`Carousel ad — ${result.angle}`, JSON.stringify(data), JSON.stringify(result), 0.05 * result.cards.length]
    );

    const { sendTelegramImages } = await import("../social-publish/telegram-media");
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    let delivered = false;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            `📣 <b>Carousel ad ready — ${escapeHtml(result.angle)}</b>\n\n` +
            `<b>Primary text (shared across all cards):</b>\n<code>${escapeHtml(result.primary_text)}</code>\n\n` +
            `<b>CTA:</b> ${escapeHtml(result.cta)}\n\n${result.cards.length} cards below, in order.`,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
      for (const card of result.cards) {
        if (card.image_url) {
          await sendTelegramImages({
            imageUrl: card.image_url,
            label: `${escapeHtml(card.headline)} — ${escapeHtml(card.description)}`,
          });
        }
      }
      delivered = true;
    }

    return { job, result, delivery: { delivered } };
  });
