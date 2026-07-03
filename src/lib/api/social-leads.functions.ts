import { requireAdmin } from "@/lib/auth.server";
import { q } from "@/lib/db.server";
import type { SocialLead, SocialPlatform, PostCategory, PostStatus } from "@/lib/social-monitor/types";

export async function listSocialLeads(params: {
  platform?: SocialPlatform;
  category?: PostCategory;
  status?: PostStatus;
  page?: number;
  limit?: number;
}): Promise<{ leads: SocialLead[]; total: number }> {
  await requireAdmin();

  const page = params.page || 1;
  const limit = Math.min(params.limit || 50, 100);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.platform) {
    conditions.push(`platform = $${idx++}`);
    values.push(params.platform);
  }
  if (params.category) {
    conditions.push(`ai_category = $${idx++}`);
    values.push(params.category);
  }
  if (params.status) {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult, leadsResult] = await Promise.all([
    q<{ count: number }>(`SELECT count(*) as count FROM social_leads ${where}`, values),
    q<SocialLead>(
      `SELECT * FROM social_leads ${where} ORDER BY discovered_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
  ]);

  return {
    leads: leadsResult,
    total: Number(countResult[0]?.count || 0),
  };
}

export async function updateSocialLeadStatus(
  leadId: string,
  status: PostStatus
): Promise<{ ok: boolean }> {
  await requireAdmin();

  await q(
    `UPDATE social_leads SET status = $1, commented_at = CASE WHEN $1 = 'commented' THEN now() ELSE commented_at END WHERE id = $2`,
    [status, leadId]
  );

  return { ok: true };
}

export async function getSocialLeadStats(): Promise<{
  total: number;
  hot: number;
  warm: number;
  cold: number;
  commented: number;
  discovered: number;
  byPlatform: Record<string, number>;
}> {
  await requireAdmin();

  const [total, byCategory, byStatus, byPlatform] = await Promise.all([
    q<{ count: number }>(`SELECT count(*) as count FROM social_leads`, []),
    q<{ ai_category: string; count: number }>(
      `SELECT ai_category, count(*) as count FROM social_leads GROUP BY ai_category`,
      []
    ),
    q<{ status: string; count: number }>(
      `SELECT status, count(*) as count FROM social_leads GROUP BY status`,
      []
    ),
    q<{ platform: string; count: number }>(
      `SELECT platform, count(*) as count FROM social_leads GROUP BY platform`,
      []
    ),
  ]);

  const catMap = Object.fromEntries(byCategory.map((r) => [r.ai_category, Number(r.count)]));
  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)]));
  const platMap = Object.fromEntries(byPlatform.map((r) => [r.platform, Number(r.count)]));

  return {
    total: Number(total[0]?.count || 0),
    hot: catMap.hot || 0,
    warm: catMap.warm || 0,
    cold: catMap.cold || 0,
    commented: statusMap.commented || 0,
    discovered: statusMap.discovered || 0,
    byPlatform: platMap,
  };
}