import { initFal } from "./fal-client";

const KLING_V25_TURBO_STANDARD = "fal-ai/kling-video/v2.5-turbo/standard/image-to-video";
const KLING_V25_TURBO_PRO = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";
const KLING_TEXT_TO_VIDEO = "fal-ai/kling-video/v2.5-turbo/standard/text-to-video";

export type KlingModel = "standard" | "pro";
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface KlingInput {
  prompt: string;
  image_url?: string;
  duration?: 5 | 10;
  aspect_ratio?: AspectRatio;
  model?: KlingModel;
  cfg_scale?: number;
  negative_prompt?: string;
}

export interface KlingClipResult {
  videoUrl: string;
  duration: number;
  costUsd: number;
}

const PRICING: Record<string, Record<number, number>> = {
  standard: { 5: 0.21, 10: 0.63 },
  pro: { 5: 0.35, 10: 1.05 },
};

export async function generateClip(input: KlingInput): Promise<KlingClipResult> {
  const fal = initFal();
  const model = input.model || "standard";
  const duration = input.duration || 5;

  const endpoint = input.image_url
    ? (model === "pro" ? KLING_V25_TURBO_PRO : KLING_V25_TURBO_STANDARD)
    : KLING_TEXT_TO_VIDEO;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fal.subscribe(endpoint, {
    input: {
      prompt: input.prompt,
      ...(input.image_url && { image_url: input.image_url }),
      duration: duration.toString(),
      aspect_ratio: input.aspect_ratio || "9:16",
      ...(input.cfg_scale !== undefined && { cfg_scale: input.cfg_scale }),
      ...(input.negative_prompt && { negative_prompt: input.negative_prompt }),
    },
  });

  const costUsd = PRICING[model]?.[duration] ?? 0.21;

  return {
    videoUrl: result.data?.video?.url || result.video?.url || "",
    duration,
    costUsd,
  };
}
