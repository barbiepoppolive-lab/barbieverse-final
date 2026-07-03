import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listMarketingContacts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(1000).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const offset = (data.page - 1) * data.pageSize;
    return q<{
      whatsapp: string;
      name: string;
      orders_count: number;
      total_spent: number;
      last_order_at: string;
    }>(
      `SELECT
         regexp_replace(whatsapp, '[^0-9]', '', 'g') AS whatsapp,
         MAX(name) AS name,
         COUNT(*)::int AS orders_count,
         COALESCE(SUM(amount) FILTER (WHERE status IN ('verified','completed','paid_pending_delivery')), 0)::int AS total_spent,
         MAX(created_at) AS last_order_at
       FROM orders
       WHERE whatsapp IS NOT NULL AND length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) >= 8
       GROUP BY regexp_replace(whatsapp, '[^0-9]', '', 'g')
       ORDER BY last_order_at DESC
       LIMIT $1 OFFSET $2`,
      [data.pageSize, offset],
    );
  });

export const sendBulkPromo = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        numbers: z.array(z.string().regex(/^\d{8,15}$/)).min(1).max(500),
        message: z.string().trim().min(5).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    // Generate WhatsApp click-to-chat URLs for each number
    // Admin can open these to send messages manually
    const results = data.numbers.map((to) => {
      const encoded = encodeURIComponent(data.message);
      const url = `https://wa.me/${to}?text=${encoded}`;
      return { to, ok: true, url };
    });

    // Log to Telegram for tracking
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              `📢 <b>BULK PROMO READY</b>\n\n` +
              `Numbers: ${data.numbers.length}\n` +
              `Message: ${data.message.slice(0, 100)}...\n\n` +
              `Admin panel → Marketing to send.`,
            parse_mode: "HTML",
          }),
        });
      }
    } catch (e) {
      // Non-critical
    }

    return { ok: true, sent: 0, failed: 0, results, message: "WhatsApp URLs generated. Open admin panel → Marketing to send." };
  });
