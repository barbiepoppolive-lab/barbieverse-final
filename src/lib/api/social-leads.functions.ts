import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool } from "@/lib/db.server";
import type { SocialLead, SocialPlatform, PostCategory, PostStatus } from "@/lib/social-monitor/types";

async function requireAdmin() {
  const { useSession } = await import("@tanstack/react-start/server");
  const { verifyAdminSession } = await import("@/lib/admin-session.server");
  const session = await useSession({ password: process.env.ADMIN_SESSION_SECRET || "" });
  if (!session?.data?.isAdmin) throw new Error("Unauthorized");
}

async function q(text: string, params: any[] = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

export const listSocialLeads = createServerFn({ validator: z.object({
  platform: z.enum(["facebook", "reddit", "twitter", "youtube", "telegram"]).optional(),
  category: z.enum(["hot", "warm", "cold"]).optional(),
  status: z.enum(["discovered", "commented", "replied", "dismissed"]).optional(),
  sort: z.enum(["date", "score", "category"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
})}).handler(async ({ data }) => {
  await requireAdmin();

  const page = data.page || 1;
  const limit = Math.min(data.limit || 50, 100);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.platform) {
    conditions.push(`platform = $${idx++}`);
    values.push(data.platform);
  }
  if (data.category) {
    conditions.push(`ai_category = $${idx++}`);
    values.push(data.category);
  }
  if (data.status) {
    conditions.push(`status = $${idx++}`);
    values.push(data.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY discovered_at DESC";
  if (data.sort === "score") orderBy = "ORDER BY engagement_score DESC, ai_confidence DESC";
  else if (data.sort === "category") orderBy = "ORDER BY CASE ai_category WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 WHEN 'cold' THEN 3 END, engagement_score DESC";

  const [countResult, leadsResult] = await Promise.all([
    q(`SELECT count(*) as count FROM social_leads ${where}`, values),
    q(
      `SELECT * FROM social_leads ${where} ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
  ]);

  return {
    leads: leadsResult as SocialLead[],
    total: Number(countResult[0]?.count || 0),
  };
});

export const updateSocialLeadStatus = createServerFn({ validator: z.object({
  leadId: z.string(),
  status: z.enum(["discovered", "commented", "replied", "dismissed"]),
})}).handler(async ({ data }) => {
  await requireAdmin();

  await q(
    `UPDATE social_leads SET status = $1, commented_at = CASE WHEN $1 = 'commented' THEN now() ELSE commented_at END WHERE id = $2`,
    [data.status, data.leadId]
  );

  return { ok: true };
});

export const runSocialMonitor = createServerFn().handler(async () => {
  await requireAdmin();
  const { monitorAllPlatforms } = await import("@/lib/social-monitor/index");
  return monitorAllPlatforms();
});

export const getSocialLeadStats = createServerFn().handler(async () => {
  await requireAdmin();

  const [total, byCategory, byStatus, byPlatform] = await Promise.all([
    q(`SELECT count(*) as count FROM social_leads`, []),
    q(`SELECT ai_category, count(*) as count FROM social_leads GROUP BY ai_category`, []),
    q(`SELECT status, count(*) as count FROM social_leads GROUP BY status`, []),
    q(`SELECT platform, count(*) as count FROM social_leads GROUP BY platform`, []),
  ]);

  const catMap = Object.fromEntries(byCategory.map((r: any) => [r.ai_category, Number(r.count)]));
  const statusMap = Object.fromEntries(byStatus.map((r: any) => [r.status, Number(r.count)]));
  const platMap = Object.fromEntries(byPlatform.map((r: any) => [r.platform, Number(r.count)]));

  return {
    total: Number(total[0]?.count || 0),
    hot: catMap.hot || 0,
    warm: catMap.warm || 0,
    cold: catMap.cold || 0,
    commented: statusMap.commented || 0,
    discovered: statusMap.discovered || 0,
    byPlatform: platMap,
  };
});
