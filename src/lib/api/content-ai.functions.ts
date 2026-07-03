import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Generate Blog Post ─────────────────────────────────

export const generateBlogPost = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          format: z.enum(["guide", "listicle", "story", "how-to", "news"]).default("guide"),
          word_count: z.number().min(300).max(3000).default(800),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateBlogPost: gen } = await import("../ai/modules/content-ai");
    const result = await gen({
      topic: data.topic,
      format: data.format,
      word_count: data.word_count,
    });

    const textCost = 0.05;

    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('blog_post', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), textCost]
    );

    return { job, post: result, totalCost: textCost };
  });

// ── Generate Social Post ───────────────────────────────

export const generateSocialPost = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          platform: z.enum(["instagram", "twitter", "linkedin", "facebook"]),
          topic: z.string().min(1),
          goal: z.enum(["engagement", "traffic", "sales", "awareness"]).default("engagement"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateSocialPost: gen } = await import("../ai/modules/content-ai");
    const result = await gen({
      platform: data.platform,
      topic: data.topic,
      goal: data.goal,
    });

    const textCost = 0.01;

    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('social_post', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), textCost]
    );

    return { job, post: result, totalCost: textCost };
  });

// ── List Content Jobs ──────────────────────────────────

export const listContentJobs = createServerFn({ method: "GET" })
  .validator((d) => z.object({ type: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    const where = data.type ? `WHERE job_type = $1` : "";
    const params = data.type ? [data.type] : [];

    return q(
      `SELECT * FROM content_generation_jobs ${where} ORDER BY created_at DESC LIMIT 50`,
      params
    );
  });

// ── Content Stats ──────────────────────────────────────

export const getContentStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q1, q } = await import("../db.server");

    const totals = await q1(
      `SELECT
         COUNT(*) as total_jobs,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COALESCE(SUM(total_cost_usd), 0) as total_cost,
         COALESCE(AVG(total_cost_usd), 0) as avg_cost
       FROM content_generation_jobs`
    );

    const byType = await q(
      `SELECT job_type, COUNT(*) as count, COALESCE(SUM(total_cost_usd), 0) as cost
       FROM content_generation_jobs
       GROUP BY job_type ORDER BY count DESC`
    );

    const recent = await q(
      `SELECT DATE(created_at) as day, COUNT(*) as count, COALESCE(SUM(total_cost_usd), 0) as cost
       FROM content_generation_jobs
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY day`
    );

    return { totals, byType, recent };
  });

// ── Delete Content Job ─────────────────────────────────

export const deleteContentJob = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    await q(`DELETE FROM content_generation_jobs WHERE id = $1`, [data.id]);
    return { ok: true };
  });