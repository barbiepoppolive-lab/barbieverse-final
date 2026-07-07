import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Media Agent — Full Pipeline (Hook → Content → Visual → Quality Review) ──

const mediaAgentSchema = z.object({
  topic: z.string().min(1),
  pipeline: z.enum(["reel", "carousel", "story", "post", "thread", "full-video"]).default("reel"),
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "moj", "facebook", "linkedin"]).default("instagram"),
  count: z.number().min(1).max(10).optional(),
  duration: z.number().min(3).max(30).optional(),
  style: z.string().optional(),
  with_video: z.boolean().default(false),
  with_image: z.boolean().default(true),
  quality_threshold: z.number().min(0).max(100).default(70),
  budget_usd: z.number().min(0).max(10).optional(),
});

export const generateMediaAgent = createServerFn({ method: "POST" })
  .validator((d) => mediaAgentSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateMedia } = await import("../ai/media-agent");

    const result = await generateMedia({
      topic: data.topic,
      pipeline: data.pipeline,
      platform: data.platform,
      count: data.count,
      duration: data.duration,
      style: data.style,
      with_video: data.with_video,
      with_image: data.with_image,
      quality_threshold: data.quality_threshold,
      budget_usd: data.budget_usd,
    });

    // Log to DB
    const cost = result.estimated_cost;
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('media_agent', $1, $2, $3, 'draft', $4, NOW())
       RETURNING *`,
      [
        result.content?.title || data.topic,
        JSON.stringify(data),
        JSON.stringify({
          hook: result.hook,
          content: result.content,
          quality: result.quality,
          visual_prompt: result.visual_prompt,
          image_url: result.image_url,
          video: result.video,
        }),
        cost,
      ]
    );

    return { job, ...result };
  });

// ── Skill Execution (quick command-based generation) ──

const skillSchema = z.object({
  command: z.string().min(1),
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "moj", "facebook", "linkedin"]).optional(),
  count: z.number().min(1).max(10).optional(),
  style: z.string().optional(),
});

export const executeSkillCommand = createServerFn({ method: "POST" })
  .validator((d) => skillSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { parseSkillCommand, executeSkill, isSkillCommand } = await import("../ai/skills");

    if (!isSkillCommand(data.command)) {
      throw new Error("Not a valid skill command. Start with / (e.g., /reel topic)");
    }

    const { skill, topic } = parseSkillCommand(data.command);
    if (!skill) {
      throw new Error("Unknown skill. Available: /reel /carousel /story /post /thread /poll /moj /facebook /reddit /recruit /month /audit");
    }

    const result = await executeSkill(skill, {
      topic,
      platform: data.platform,
      count: data.count,
      style: data.style,
    });

    // Log to DB
    const { q1 } = await import("../db.server");
    const job = await q1(
      `INSERT INTO content_generation_jobs (job_type, title, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('skill', $1, $2, $3, 'draft', 0, NOW())
       RETURNING *`,
      [
        `/${skill} ${topic}`,
        JSON.stringify(data),
        JSON.stringify(result),
      ]
    );

    return { job, ...result };
  });
