import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const providerSchema = z.enum(["premium", "free"]).default("free");

// ── Generate Carousel ──────────────────────────────────

export const generateCarousel = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          slides: z.number().min(3).max(10).default(7),
          style: z.enum(["educational", "storytelling", "listicle", "tips"]).default("educational"),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateCarousel: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ topic: data.topic, slides: data.slides, style: data.style, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('carousel', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Reel Script ───────────────────────────────

export const generateReelScript = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          duration: z.enum(["15s", "30s", "60s", "90s"]).default("30s"),
          style: z.enum(["educational", "entertaining", "inspirational", "behind-the-scenes"]).default("educational"),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateReelScript: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ topic: data.topic, duration: data.duration, style: data.style, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('reel_script', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Thumbnail ─────────────────────────────────

export const generateThumbnail = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          title: z.string().min(1),
          style: z.enum(["bold", "clean", "dramatic", "playful"]).default("bold"),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateThumbnail: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ title: data.title, style: data.style, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('thumbnail', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Story ─────────────────────────────────────

export const generateStory = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          slides: z.number().min(2).max(5).default(3),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateStory: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ topic: data.topic, slides: data.slides, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('story', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Thread ────────────────────────────────────

export const generateThread = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          platform: z.enum(["twitter", "linkedin"]).default("twitter"),
          tweets: z.number().min(3).max(10).default(5),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateThread: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ topic: data.topic, platform: data.platform, tweets: data.tweets, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('thread', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Poll ──────────────────────────────────────

export const generatePoll = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          platform: z.enum(["twitter", "linkedin", "instagram"]).default("twitter"),
          provider: providerSchema,
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generatePoll: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ topic: data.topic, platform: data.platform, provider: data.provider });

    const cost = data.provider === "premium" ? 0.003 : 0;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('poll', $1, $2, 'completed', $3, NOW())
       RETURNING *`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return { job, content: result, provider: data.provider, cost };
  });

// ── Generate Weekly Plan ───────────────────────────────

export const generateWeeklyPlan = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          platforms: z.array(z.enum(["instagram", "twitter", "linkedin", "facebook", "youtube"])).default(["instagram", "twitter"]),
          content_types: z.array(z.enum(["carousel", "reel_script", "thumbnail", "story", "blog_post", "social_post", "thread", "poll"])).default(["carousel", "social_post", "reel_script", "thread"]),
          theme: z.string().default("creator economy and live streaming tips"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateWeeklyPlan: gen } = await import("../ai/modules/brand-manager");
    const result = await gen({ platforms: data.platforms, content_types: data.content_types, theme: data.theme });

    const { q } = await import("../db.server");

    // Save calendar entries
    for (const entry of result) {
      await q(
        `INSERT INTO content_calendar (date, platform, content_type, topic, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [entry.date, entry.platform, entry.content_type, entry.topic, entry.status]
      );
    }

    return { entries: result, count: result.length };
  });

// ── List Calendar Entries ──────────────────────────────

export const listCalendarEntries = createServerFn({ method: "GET" })
  .validator(
    (d) =>
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          platform: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (data.from) { params.push(data.from); where += ` AND date >= $${params.length}`; }
    if (data.to) { params.push(data.to); where += ` AND date <= $${params.length}`; }
    if (data.platform) { params.push(data.platform); where += ` AND platform = $${params.length}`; }

    return q(
      `SELECT * FROM content_calendar ${where} ORDER BY date, platform`,
      params
    );
  });

// ── Update Calendar Entry ──────────────────────────────

export const updateCalendarEntry = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["draft", "approved", "scheduled", "published", "failed"]).optional(),
          content_id: z.string().uuid().optional(),
          scheduled_for: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status) { params.push(data.status); updates.push(`status = $${params.length}`); }
    if (data.content_id) { params.push(data.content_id); updates.push(`content_id = $${params.length}`); }
    if (data.scheduled_for) { params.push(data.scheduled_for); updates.push(`scheduled_for = $${params.length}`); }

    if (updates.length === 0) return { ok: true };

    params.push(data.id);
    await q(`UPDATE content_calendar SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`, params);

    return { ok: true };
  });

// ── Delete Calendar Entry ──────────────────────────────

export const deleteCalendarEntry = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    await q(`DELETE FROM content_calendar WHERE id = $1`, [data.id]);
    return { ok: true };
  });

// ── Content Queue (approve/publish) ────────────────────

export const getContentQueue = createServerFn({ method: "GET" })
  .validator((d) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    const where = data.status ? `WHERE status = $1` : "";
    const params = data.status ? [data.status] : [];

    return q(
      `SELECT * FROM content_generation_jobs ${where} ORDER BY created_at DESC LIMIT 50`,
      params
    );
  });

// ── Update Content Status ──────────────────────────────

export const updateContentStatus = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["draft", "approved", "scheduled", "published", "failed"]),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q } = await import("../db.server");
    await q(
      `UPDATE content_generation_jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
      [data.status, data.id]
    );
    return { ok: true };
  });

// ── Brand Manager Stats ────────────────────────────────

export const getBrandManagerStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { q1, q } = await import("../db.server");

    const totals = await q1(
      `SELECT
         COUNT(*) as total_content,
         COUNT(*) FILTER (WHERE status = 'draft') as drafts,
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'published') as published,
         COALESCE(SUM(total_cost_usd), 0) as total_cost
       FROM content_generation_jobs`
    );

    const byType = await q(
      `SELECT job_type, COUNT(*) as count
       FROM content_generation_jobs
       GROUP BY job_type ORDER BY count DESC`
    );

    const byPlatform = await q(
      `SELECT platform, COUNT(*) as count
       FROM content_calendar
       GROUP BY platform ORDER BY count DESC`
    );

    const calendarCount = await q1(
      `SELECT COUNT(*) as total FROM content_calendar`
    );

    return { totals, byType, byPlatform, calendarCount };
  });

// ── Improve Content ────────────────────────────────────

export const improveContent = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          content: z.string(),
          instruction: z.string().min(1),
          content_type: z.string().default("carousel"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { improveContent: improve } = await import("../ai/content-quality");
    return improve({
      content: data.content,
      instruction: data.instruction,
      content_type: data.content_type,
    });
  });

// ── Quick Repurpose ────────────────────────────────────

export const quickRepurpose = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          content: z.string(),
          source_type: z.string().default("carousel"),
          target_type: z.string(),
          topic: z.string().default(""),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { quickRepurpose: repurpose } = await import("../ai/content-repurpose");
    return repurpose({
      content: data.content,
      title: data.topic || "Untitled",
      source_type: data.source_type,
      target_format: data.target_type,
      platform: "instagram" as any,
      topic: data.topic,
    });
  });

// ── Generate SEO ───────────────────────────────────────

export const generateContentSEO = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          content: z.string(),
          platform: z.string().default("instagram"),
          topic: z.string().default(""),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateContentSEO: genSEO } = await import("../ai/content-seo");
    return genSEO({
      title: data.topic || "Untitled",
      content: data.content,
      platform: data.platform as any,
      content_type: "social_post",
      topic: data.topic,
    });
  });

// ── Score Content ──────────────────────────────────────

export const scoreContent = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          content: z.string(),
          content_type: z.string().default("carousel"),
          platform: z.string().default("instagram"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { scoreContent: score } = await import("../ai/content-quality");
    return score({
      content: data.content,
      content_type: data.content_type,
      platform: data.platform,
      topic: "",
    });
  });
