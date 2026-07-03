import { initFal } from "../../video/providers/fal-client";

const FLUX_SCHNELL = "fal-ai/flux/schnell";
const FLUX_DEV = "fal-ai/flux/dev";
const FLUX_PRO = "fal-ai/flux/pro";
const STABLE_DIFFUSION = "fal-ai/stable-diffusion/v3-medium";

export type ImageModel = "schnell" | "dev" | "pro" | "stable-diffusion";
export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface ImageGenInput {
  prompt: string;
  negative_prompt?: string;
  model?: ImageModel;
  num_images?: number;
  aspect_ratio?: ImageAspectRatio;
  width?: number;
  height?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
}

export interface ImageGenResult {
  imageUrl: string;
  width: number;
  height: number;
  costUsd: number;
  seed: number;
}

const PRICING: Record<ImageModel, number> = {
  schnell: 0.003,
  dev: 0.025,
  pro: 0.05,
  "stable-diffusion": 0.01,
};

const MODEL_ENDPOINTS: Record<ImageModel, string> = {
  schnell: FLUX_SCHNELL,
  dev: FLUX_DEV,
  pro: FLUX_PRO,
  "stable-diffusion": STABLE_DIFFUSION,
};

const ASPECT_RATIOS: Record<ImageAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
};

export async function generateImage(input: ImageGenInput): Promise<ImageGenResult> {
  const fal = initFal();
  const model = input.model || "schnell";
  const endpoint = MODEL_ENDPOINTS[model];

  const dims = input.aspect_ratio
    ? ASPECT_RATIOS[input.aspect_ratio]
    : { width: input.width || 1024, height: input.height || 1024 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fal.subscribe(endpoint, {
    input: {
      prompt: input.prompt,
      ...(input.negative_prompt && { negative_prompt: input.negative_prompt }),
      image_size: { width: dims.width, height: dims.height },
      num_images: input.num_images || 1,
      ...(input.seed !== undefined && { seed: input.seed }),
      ...(input.guidance_scale !== undefined && { guidance_scale: input.guidance_scale }),
      ...(input.num_inference_steps !== undefined && { num_inference_steps: input.num_inference_steps }),
    },
  });

  const image = result.data?.images?.[0] || result.images?.[0] || {};
  const costPerImage = PRICING[model];

  return {
    imageUrl: image.url || "",
    width: image.width || dims.width,
    height: image.height || dims.height,
    costUsd: costPerImage * (input.num_images || 1),
    seed: image.seed || 0,
  };
}

export async function generateMultipleImages(
  inputs: ImageGenInput[]
): Promise<ImageGenResult[]> {
  const results = await Promise.all(inputs.map(generateImage));
  return results;
}
