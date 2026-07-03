import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const generateReel = createServerFn({ method: "POST" })
  .validator(
    (d) =>
      z
        .object({
          topic: z.string().min(1, "Topic is required"),
          template: z.enum(["marketing", "testimonial", "tutorial", "announcement", "motivational"]).default("marketing"),
          duration_seconds: z.number().min(5).max(60).default(30),
          voice_id: z.enum(["rachel", "bella", "antoni", "elli", "josh", "arnold", "domi", "sam"]).default("rachel"),
          resolution: z.string().default("1080x1920"),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    // Step 1: Generate script
    const { generateReelScript } = await import("../video/pipeline/script-generator");
    const script = await generateReelScript({
      topic: data.topic,
      template: data.template,
      duration_seconds: data.duration_seconds,
    });

    // Step 2: Generate voice narration
    const { generateVoice } = await import("../video/providers/elevenlabs-tts");
    const fullNarration = script.scenes.map((s) => s.narration).join(". ");
    const voice = await generateVoice({
      text: fullNarration,
      voice_id: data.voice_id,
    });

    // Step 3: Generate visual clips (one per scene)
    const { generateClip } = await import("../video/providers/kling-video");
    const clips: Array<{ videoUrl: string; duration: number; costUsd: number }> = [];
    let totalCost = voice.costUsd;

    for (const scene of script.scenes) {
      const clipDuration = Math.min(scene.duration, 10) as 5 | 10;
      const clip = await generateClip({
        prompt: scene.visual_prompt,
        duration: clipDuration,
        aspect_ratio: "9:16",
      });
      clips.push(clip);
      totalCost += clip.costUsd;
    }

    // Step 4: Assemble final reel
    const { assembleReel } = await import("../video/pipeline/reel-assembler");
    const assembled = await assembleReel({
      clips: clips.map((c) => ({ url: c.videoUrl, duration: c.duration })),
      audioUrl: voice.audioUrl,
      resolution: data.resolution,
      textOverlays: script.scenes
        .filter((s) => s.text_overlay)
        .flatMap((s, i) => ({
          text: s.text_overlay!,
          startSec: script.scenes.slice(0, i).reduce((sum, prev) => sum + prev.duration, 0),
          duration: s.duration,
        })),
    });

    // Step 5: Save to database
    const { q1 } = await import("../db.server");
    const reel = await q1(
      `INSERT INTO video_reels
         (title, script, scenes, status, audio_url, video_clips, final_video_url,
          duration_seconds, resolution, aspect_ratio, template, voice_id, total_cost_usd, provider_costs, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, '9:16', $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        script.title,
        JSON.stringify(script),
        JSON.stringify(script.scenes),
        voice.audioUrl,
        JSON.stringify(clips.map((c) => c.videoUrl)),
        assembled.outputFilename,
        assembled.duration,
        data.resolution,
        data.template,
        data.voice_id,
        totalCost,
        JSON.stringify({
          elevenlabs: { chars: voice.charsUsed, cost: voice.costUsd },
          kling: { clips: clips.length, cost: clips.reduce((s, c) => s + c.costUsd, 0) },
          total: totalCost,
        }),
      ]
    );

    return {
      reel,
      script,
      clips: clips.map((c) => ({ videoUrl: c.videoUrl, duration: c.duration, cost: c.costUsd })),
      totalCost,
    };
  });

export const listReels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    return q(`SELECT * FROM video_reels ORDER BY created_at DESC LIMIT 50`);
  });

export const getReel = createServerFn({ method: "GET" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q1 } = await import("../db.server");
    return q1(`SELECT * FROM video_reels WHERE id = $1`, [data.id]);
  });

export const deleteReel = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q } = await import("../db.server");
    await q(`DELETE FROM video_reels WHERE id = $1`, [data.id]);
    return { ok: true };
  });

export const getReelStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();
    const { q1, q } = await import("../db.server");

    const totals = await q1(
      `SELECT
         COUNT(*) as total_reels,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COALESCE(SUM(total_cost_usd), 0) as total_cost,
         COALESCE(AVG(total_cost_usd), 0) as avg_cost,
         COALESCE(SUM(duration_seconds), 0) as total_duration
       FROM video_reels`
    );

    const recent = await q(
      `SELECT DATE(created_at) as day, COUNT(*) as count, COALESCE(SUM(total_cost_usd), 0) as cost
       FROM video_reels
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY day`
    );

    return { totals, recent };
  });
