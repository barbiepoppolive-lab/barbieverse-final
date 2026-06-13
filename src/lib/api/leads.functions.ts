import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  instagram: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(255),
  whatsapp: z.string().trim().min(6).max(20),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  follower_count: z.enum(["under_1k", "1k_10k", "10k_100k", "100k_plus"]),
  source: z.enum(["direct", "wobb"]).default("direct"),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    const { q1 } = await import("../db.server");
    const row = await q1<{ id: string }>(
      `INSERT INTO leads (name, instagram, email, whatsapp, city, follower_count, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [data.name, data.instagram || null, data.email, data.whatsapp, data.city || null, data.follower_count, data.source],
    );
    // Fire-and-forget automations (don't block response on slow APIs)
    try {
      const { sendBrevoEmail, sendInteraktNotification, welcomeEmailHtml } = await import(
        "../notifications.server"
      );
      await Promise.allSettled([
        sendBrevoEmail({
          to: data.email,
          toName: data.name,
          subject: "Welcome to Barbieverse 💖 Your ₹500 bonus is waiting",
          htmlContent: welcomeEmailHtml(data.name),
        }),
        sendInteraktNotification({
          message: `🆕 New ${data.source.toUpperCase()} lead\nName: ${data.name}\nWhatsApp: ${data.whatsapp}\nInstagram: ${data.instagram || "—"}\nCity: ${data.city || "—"}\nFollowers: ${data.follower_count}`,
        }),
      ]);
    } catch (e) {
      console.error("[lead automations]", e);
    }
    return { ok: true, id: row?.id };
  });

export const listLeads = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        source: z.enum(["all", "direct", "wobb"]).default("all"),
        status: z.string().default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(500).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    const where: string[] = [];
    const params: any[] = [];
    if (data.source !== "all") {
      params.push(data.source);
      where.push(`source = $${params.length}`);
    }
    if (data.status !== "all") {
      params.push(data.status);
      where.push(`status = $${params.length}`);
    }
    const offset = (data.page - 1) * data.pageSize;
    const sql = `SELECT * FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    return q(sql, [...params, data.pageSize, offset]);
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "joined", "converted", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`UPDATE leads SET status = $1 WHERE id = $2`, [data.status, data.id]);
    return { ok: true };
  });

export const leadStats = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q1 } = await import("../db.server");
  const stats = await q1<any>(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS week,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE source = 'wobb') AS wobb,
      COUNT(*) FILTER (WHERE source = 'direct') AS direct,
      COUNT(*) FILTER (WHERE status = 'converted') AS converted,
      COUNT(*) FILTER (WHERE source = 'wobb' AND status = 'converted') AS wobb_converted
    FROM leads
  `);
  return stats ?? {};
});

export const leadDailySeries = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("../admin-session.server");
  await requireAdmin();
  const { q } = await import("../db.server");
  return q<any>(`
    SELECT
      to_char(d::date, 'DD Mon') AS day,
      COALESCE(SUM(CASE WHEN source = 'wobb' THEN 1 ELSE 0 END), 0)::int AS wobb,
      COALESCE(SUM(CASE WHEN source = 'direct' THEN 1 ELSE 0 END), 0)::int AS direct
    FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
    LEFT JOIN leads ON date_trunc('day', leads.created_at) = d
    GROUP BY d ORDER BY d
  `);
});
