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

    // WhatsApp bulk messaging requires an API (Interakt/Meta/AiSensy) — not configured.
    // Messages are logged but not sent. Use manual WhatsApp from admin panel instead.
    console.warn("[marketing] bulk WhatsApp not configured — messages logged only");
    const results = data.numbers.map((to) => ({ to, ok: false, skipped: true }));
    return { ok: true, sent: 0, failed: data.numbers.length, results };
  });
