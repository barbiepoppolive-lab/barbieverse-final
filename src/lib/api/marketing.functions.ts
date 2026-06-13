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
    const { sendInteraktNotification } = await import("../notifications.server");

    // Interakt safe send-rate ≈ 80 messages/min → ~750ms between sends.
    const DELAY_MS = 800;
    const results: { to: string; ok: boolean }[] = [];
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < data.numbers.length; i++) {
      const to = data.numbers[i];
      const r = await sendInteraktNotification({ to, message: data.message });
      const ok = !!r.ok;
      results.push({ to, ok });
      if (ok) sent++;
      else failed++;
      if (i < data.numbers.length - 1) {
        await new Promise((res) => setTimeout(res, DELAY_MS));
      }
    }
    return { ok: true, sent, failed, results };
  });
