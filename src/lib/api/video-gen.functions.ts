import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const providerSchema = z.enum(["premium", "free"]).default("free");

// ── Generate Video Script ──────────────────────────────

export const generateVideoScript = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          duration: z.enum(["15", "30", "60"]).default("30"),
          platform: z.enum(["youtube", "instagram", "tiktok"]).default("youtube"),
          style: z.enum(["educational", "entertaining", "promotional"]).default("educational"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateVideoScript: gen } = await import("../ai/video-gen");
    const result = await gen({
      topic: data.topic,
      duration: data.duration,
      platform: data.platform,
      style: data.style,
    });

    const { q1 } = await import("../db.server");
    await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('video_script', $1, $2, 'completed', 0, NOW())`,
      [JSON.stringify(data), JSON.stringify(result)]
    );

    return result;
  });

// ── Generate Video ─────────────────────────────────────

export const generateVideo = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          prompt: z.string().min(1),
          image_url: z.string().optional(),
          duration: z.enum(["5", "10"]).default("5"),
          aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
          model: z.enum(["kling", "hailuo"]).default("kling"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateVideo: gen } = await import("../ai/video-gen");
    return gen({
      prompt: data.prompt,
      image_url: data.image_url,
      duration: data.duration,
      aspect_ratio: data.aspect_ratio,
      model: data.model,
    });
  });

// ── Generate Voice ─────────────────────────────────────

export const generateVoice = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          text: z.string().min(1),
          voice: z.string().default("jenny"),
          model: z.enum(["eleven_multilingual_v2", "eleven_turbo_v2_5"]).default("eleven_multilingual_v2"),
          stability: z.number().min(0).max(1).default(0.5),
          similarity_boost: z.number().min(0).max(1).default(0.75),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateVoice: gen } = await import("../ai/video-gen");
    return gen({
      text: data.text,
      voice: data.voice,
      model: data.model,
      stability: data.stability,
      similarity_boost: data.similarity_boost,
    });
  });

// ── Generate Full Video ────────────────────────────────

export const generateFullVideo = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1),
          duration: z.enum(["15", "30", "60"]).default("30"),
          platform: z.enum(["youtube", "instagram", "tiktok"]).default("youtube"),
          style: z.enum(["educational", "entertaining", "promotional"]).default("educational"),
          image_url: z.string().optional(),
          voice: z.string().default("jenny"),
          withVoiceover: z.boolean().default(true),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { generateFullVideo: gen } = await import("../ai/video-gen");
    const result = await gen({
      topic: data.topic,
      duration: data.duration,
      platform: data.platform,
      style: data.style,
      image_url: data.image_url,
      voice: data.voice,
      withVoiceover: data.withVoiceover,
    });

    const cost = result.video?.cost || 0;
    const { q1 } = await import("../db.server");
    await q1(
      `INSERT INTO content_generation_jobs (job_type, input_params, output_data, status, total_cost_usd, completed_at)
       VALUES ('video', $1, $2, 'completed', $3, NOW())`,
      [JSON.stringify(data), JSON.stringify(result), cost]
    );

    return result;
  });

// ── Video Gen Status ───────────────────────────────────

export const getVideoGenStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { getVideoGenStatus: getStatus } = await import("../ai/video-gen");
    return getStatus();
  });
