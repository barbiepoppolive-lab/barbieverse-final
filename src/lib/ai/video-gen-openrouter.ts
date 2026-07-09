// OpenRouter Video Generation — Async API for Kling, Seedance, Veo, Sora, Wan
// Uses OpenRouter's /api/v1/videos endpoint (submit → poll → download)
// Pricing: Kling $0.07/s, Seedance $0.036/s, Veo Fast $0.10/s, Sora $0.10/s

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export type VideoModel =
  | "kling-3.0-pro"
  | "kling-3.0-standard"
  | "seedance-1.5-pro"
  | "seedance-2.0"
  | "veo-3.1-fast"
  | "veo-3.1-lite"
  | "veo-3.1-full"
  | "sora-2-pro"
  | "wan-2.7"
  | "wan-2.6";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export interface OpenRouterVideoInput {
  prompt: string;
  model?: VideoModel;
  image_url?: string;
  duration?: number;
  aspect_ratio?: AspectRatio;
  audio?: boolean;
  resolution?: "480p" | "720p" | "1080p";
}

export interface OpenRouterVideoResult {
  job_id: string;
  status: VideoStatus;
  video_url?: string;
  duration: number;
  aspect_ratio: string;
  model: string;
  cost_estimate: number;
  poll_url?: string;
}

export interface VideoModelInfo {
  id: VideoModel;
  openrouter_id: string;
  name: string;
  provider: string;
  cost_per_second: number;
  max_duration: number;
  resolutions: string[];
  aspect_ratios: AspectRatio[];
  supports_image: boolean;
  supports_audio: boolean;
}

// ── Model Registry ─────────────────────────────────────

export const VIDEO_MODELS: Record<VideoModel, VideoModelInfo> = {
  "kling-3.0-pro": {
    id: "kling-3.0-pro",
    openrouter_id: "kwaivgi/kling-v3.0-pro",
    name: "Kling 3.0 Pro",
    provider: "kwaivgi",
    cost_per_second: 0.17,
    max_duration: 15,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: true,
  },
  "kling-3.0-standard": {
    id: "kling-3.0-standard",
    openrouter_id: "kwaivgi/kling-v3.0-std",
    name: "Kling 3.0 Standard",
    provider: "kwaivgi",
    cost_per_second: 0.07,
    max_duration: 15,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: false,
  },
  "seedance-1.5-pro": {
    id: "seedance-1.5-pro",
    openrouter_id: "bytedance/seedance-1-5-pro",
    name: "Seedance 1.5 Pro",
    provider: "bytedance",
    cost_per_second: 0.05,
    max_duration: 12,
    resolutions: ["480p", "720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    supports_image: true,
    supports_audio: true,
  },
  "seedance-2.0": {
    id: "seedance-2.0",
    openrouter_id: "bytedance/seedance-2.0",
    name: "Seedance 2.0",
    provider: "seedance",
    cost_per_second: 0.036,
    max_duration: 15,
    resolutions: ["480p", "720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: true,
  },
  "veo-3.1-fast": {
    id: "veo-3.1-fast",
    openrouter_id: "google/veo-3.1-fast",
    name: "Veo 3.1 Fast",
    provider: "google",
    cost_per_second: 0.10,
    max_duration: 8,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: true,
  },
  "veo-3.1-lite": {
    id: "veo-3.1-lite",
    openrouter_id: "google/veo-3.1-lite",
    name: "Veo 3.1 Lite",
    provider: "google",
    cost_per_second: 0.05,
    max_duration: 8,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16"],
    supports_image: true,
    supports_audio: true,
  },
  "veo-3.1-full": {
    id: "veo-3.1-full",
    openrouter_id: "google/veo-3.1",
    name: "Veo 3.1 Full",
    provider: "google",
    cost_per_second: 0.40,
    max_duration: 8,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: true,
  },
  "sora-2-pro": {
    id: "sora-2-pro",
    openrouter_id: "openai/sora-2-pro",
    name: "Sora 2 Pro",
    provider: "openai",
    cost_per_second: 0.70,
    max_duration: 20,
    resolutions: ["720p", "1080p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: true,
  },
  "wan-2.7": {
    id: "wan-2.7",
    openrouter_id: "alibaba/wan-2.7",
    name: "Wan 2.7",
    provider: "wan",
    cost_per_second: 0.04,
    max_duration: 10,
    resolutions: ["480p", "720p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: false,
  },
  "wan-2.6": {
    id: "wan-2.6",
    openrouter_id: "alibaba/wan-2.6",
    name: "Wan 2.6",
    provider: "wan",
    cost_per_second: 0.04,
    max_duration: 10,
    resolutions: ["480p", "720p"],
    aspect_ratios: ["16:9", "9:16", "1:1"],
    supports_image: true,
    supports_audio: false,
  },
};

// ── Cost Estimates ─────────────────────────────────────

export function estimateVideoCost(model: VideoModel, durationSec: number): number {
  const info = VIDEO_MODELS[model];
  return info.cost_per_second * durationSec;
}

export function getModelForBudget(budgetUsd: number, durationSec: number): VideoModel[] {
  return (Object.values(VIDEO_MODELS) as VideoModelInfo[])
    .filter((m) => m.cost_per_second * durationSec <= budgetUsd)
    .sort((a, b) => a.cost_per_second - b.cost_per_second)
    .map((m) => m.id);
}

export function getBestModelForUseCase(useCase: "reel" | "hero" | "broll" | "budget"): VideoModel {
  switch (useCase) {
    case "reel":
      return "seedance-1.5-pro";
    case "hero":
      return "veo-3.1-fast";
    case "broll":
      return "seedance-1.5-pro";
    case "budget":
      return "veo-3.1-lite";
    default:
      return "seedance-1.5-pro";
  }
}

// ── OpenRouter Video API Client ────────────────────────

const OPENROUTER_API = "https://openrouter.ai/api/v1";

async function getApiKey(): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  return key;
}

/**
 * Submit a video generation job to OpenRouter.
 * Returns a job ID for polling.
 */
export async function submitVideoJob(
  input: OpenRouterVideoInput
): Promise<{ job_id: string; poll_url: string }> {
  const apiKey = await getApiKey();
  const model = input.model || "kling-3.0-standard";
  const modelInfo = VIDEO_MODELS[model];

  const body: any = {
    model: modelInfo.openrouter_id,
    prompt: input.prompt,
    duration: input.duration || 5,
    aspect_ratio: input.aspect_ratio || "9:16",
    resolution: input.resolution || "720p",
  };

  if (input.image_url && modelInfo.supports_image) {
    body.image_url = input.image_url;
  }

  if (input.audio !== undefined && modelInfo.supports_audio) {
    body.audio = input.audio;
  }

  const response = await fetch(`${OPENROUTER_API}/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://barbieverse.org",
      "X-Title": "BarbieVerse Video Gen",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter video submit failed: ${err}`);
  }

  const data = await response.json();
  return {
    job_id: data.id || data.job_id,
    poll_url: `${OPENROUTER_API}/videos/${data.id || data.job_id}`,
  };
}

/**
 * Poll a video job until completion.
 * Returns the final video URL or throws on failure.
 */
export async function pollVideoJob(
  pollUrl: string,
  maxWaitMs: number = 600_000,
  intervalMs: number = 5_000
): Promise<OpenRouterVideoResult> {
  const apiKey = await getApiKey();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter video poll failed: ${err}`);
    }

    const data = await response.json();

    if (data.status === "completed" || data.status === "succeeded") {
      // Try ALL possible video URL fields across different OpenRouter model responses
      const videoUrl = data.video_url
        || data.output?.video_url
        || data.output?.url
        || data.url
        || data.video?.url
        || data.video
        || data.output
        || data.unsigned_urls?.[0]
        || (Array.isArray(data.urls) ? data.urls[0] : undefined)
        || "";
      return {
        job_id: data.id || data.job_id || "",
        status: "completed",
        video_url: typeof videoUrl === "string" ? videoUrl : (videoUrl?.url || ""),
        duration: data.duration || 5,
        aspect_ratio: data.aspect_ratio || "9:16",
        model: data.model || "unknown",
        cost_estimate: data.cost || 0,
        poll_url: pollUrl,
      };
    }

    if (data.status === "failed") {
      throw new Error(`Video generation failed: ${data.error || "unknown error"}`);
    }

    // Still processing — wait and retry
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Video generation timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Generate a video — submit + poll in one call.
 * Returns the completed video result.
 */
export async function generateVideoOpenRouter(
  input: OpenRouterVideoInput
): Promise<OpenRouterVideoResult> {
  const model = input.model || getBestModelForUseCase("reel");
  const duration = input.duration || 5;

  console.log(
    `[VideoGen-OR] Submitting ${model} video (${duration}s) — est. cost: $${estimateVideoCost(model, duration).toFixed(2)}`
  );

  const { job_id, poll_url } = await submitVideoJob({ ...input, model });

  console.log(`[VideoGen-OR] Job ${job_id} submitted, polling...`);

  const result = await pollVideoJob(poll_url);

  console.log(`[VideoGen-OR] Video complete: ${result.video_url}`);

  return result;
}

/**
 * Generate multiple videos in parallel (up to 3).
 */
export async function generateVideosOpenRouter(
  inputs: OpenRouterVideoInput[]
): Promise<OpenRouterVideoResult[]> {
  const limited = inputs.slice(0, 3);
  return Promise.all(limited.map((input) => generateVideoOpenRouter(input)));
}

/**
 * Generate a reel with AI-enhanced prompt.
 * Automatically enhances the prompt for cinematic quality.
 */
export async function generateReelVideo(input: {
  topic: string;
  duration?: number;
  platform?: "instagram" | "tiktok" | "youtube";
  model?: VideoModel;
  image_url?: string;
}): Promise<OpenRouterVideoResult> {
  const platform = input.platform || "instagram";
  const aspect_ratio: AspectRatio = platform === "youtube" ? "16:9" : "9:16";

  // Enhance prompt with AI
  const enhancedPrompt = await aiContent(
    `Create a cinematic video prompt for a ${platform} reel about: ${input.topic}

The prompt should describe:
- Specific scene composition and camera movement
- Lighting and mood
- Subject action and movement
- Visual style (cinematic, trending, viral)

Return ONLY the enhanced prompt, no JSON. Max 200 words.`,
    { maxTokens: 300 }
  );

  return generateVideoOpenRouter({
    prompt: enhancedPrompt.text.trim() || input.topic,
    model: input.model || getBestModelForUseCase("reel"),
    duration: input.duration || 5,
    aspect_ratio,
    image_url: input.image_url,
  });
}

/**
 * Get status of all video generation providers.
 */
export async function getVideoGenOpenRouterStatus(): Promise<{
  available: boolean;
  models: VideoModelInfo[];
  cheapest: VideoModel;
  best_quality: VideoModel;
}> {
  const available = !!process.env.OPENROUTER_API_KEY;

  return {
    available,
    models: Object.values(VIDEO_MODELS),
    cheapest: "wan-2.7",
    best_quality: "veo-3.1-full",
  };
}

/**
 * Compare costs across models for a given duration.
 */
export function compareVideoCosts(durationSec: number): {
  model: VideoModel;
  name: string;
  cost: number;
  quality: "budget" | "good" | "great" | "premium";
}[] {
  return (Object.values(VIDEO_MODELS) as VideoModelInfo[])
    .map((m) => ({
      model: m.id,
      name: m.name,
      cost: m.cost_per_second * durationSec,
      quality:
        m.cost_per_second <= 0.04
          ? ("budget" as const)
          : m.cost_per_second <= 0.10
            ? ("good" as const)
            : m.cost_per_second <= 0.20
              ? ("great" as const)
              : ("premium" as const),
    }))
    .sort((a, b) => a.cost - b.cost);
}
