// Image Generation Service — Unified interface with fallback chain
// Priority: ComfyUI (local) → Pollinations (free cloud) → Gemini (free cloud)

import {
  generateImage as comfyGenerate,
  isComfyUIAvailable,
  getHealthStatus,
  type GenerateImageInput,
  type GenerateImageResult,
} from "./comfyui";
import { generateImageUrl, downloadImage, SIZES } from "./providers/pollinations";

// ── Types ──────────────────────────────────────────────

export type ImageSize = keyof typeof SIZES | { width: number; height: number };

export interface ImageGenInput {
  prompt: string;
  negativePrompt?: string;
  size?: ImageSize;
  steps?: number;
  cfg?: number;
  seed?: number;
  model?: string;
  provider?: "comfyui" | "pollinations" | "auto";
  useFaceDetailer?: boolean;
}

export interface ImageGenResult {
  url: string;
  buffer?: Buffer;
  width: number;
  height: number;
  provider: string;
  model: string;
  elapsedMs: number;
}

// ── Size Resolution ────────────────────────────────────

function resolveSize(size?: ImageSize): { width: number; height: number } {
  if (!size) return { width: 1024, height: 1024 };
  if (typeof size === "string") {
    const s = SIZES[size] || SIZES.square;
    return { width: s.width, height: s.height };
  }
  return size;
}

// ── Provider: ComfyUI ─────────────────────────────────

async function generateViaComfyUI(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const start = Date.now();
  const { width, height } = resolveSize(input.size);

  const result = await comfyGenerate(
    {
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      width,
      height,
      steps: input.steps,
      cfg: input.cfg,
      seed: input.seed,
      model: input.model,
    },
    { useFaceDetailer: input.useFaceDetailer },
  );

  // Convert first image buffer to data URL
  const imgBuffer = result.images[0];
  if (!imgBuffer) throw new Error("ComfyUI returned no images");

  const base64 = imgBuffer.toString("base64");
  const url = `data:image/png;base64,${base64}`;

  return {
    url,
    buffer: imgBuffer,
    width: result.width,
    height: result.height,
    provider: "comfyui",
    model: result.model,
    elapsedMs: Date.now() - start,
  };
}

// ── Provider: Pollinations ─────────────────────────────

async function generateViaPollinations(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const start = Date.now();
  const { width, height } = resolveSize(input.size);

  const result = generateImageUrl({
    prompt: input.prompt,
    size: { width, height },
    seed: input.seed,
    model: "flux",
    enhance: true,
  });

  // Download the image
  const buffer = await downloadImage(result.url);

  return {
    url: result.url,
    buffer,
    width: result.width,
    height: result.height,
    provider: "pollinations",
    model: "flux",
    elapsedMs: Date.now() - start,
  };
}

// ── Main Generator with Fallback ──────────────────────

/**
 * Generate image with automatic fallback chain.
 * ComfyUI → Pollinations (if ComfyUI unavailable)
 */
export async function generateImage(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const provider = input.provider || "auto";

  // Explicit provider selection
  if (provider === "comfyui") {
    return generateViaComfyUI(input);
  }

  if (provider === "pollinations") {
    return generateViaPollinations(input);
  }

  // Auto: try ComfyUI first, fall back to Pollinations
  try {
    const available = await isComfyUIAvailable();
    if (available) {
      console.log("[ImageGen] Using ComfyUI (local)");
      return await generateViaComfyUI(input);
    }
  } catch (err: any) {
    console.warn("[ImageGen] ComfyUI failed, falling back to Pollinations:", err.message);
  }

  console.log("[ImageGen] Using Pollinations (cloud)");
  return generateViaPollinations(input);
}

/**
 * Generate multiple images in parallel.
 */
export async function generateImages(
  inputs: ImageGenInput[],
): Promise<ImageGenResult[]> {
  return Promise.all(inputs.map((input) => generateImage(input)));
}

/**
 * Check which providers are available.
 */
export async function getProviderStatus(): Promise<{
  comfyui: boolean;
  pollinations: boolean;
  comfyuiModels: string[];
  comfyuiQueue: { running: number; pending: number };
}> {
  const [comfyuiAvailable, comfyuiHealth] = await Promise.all([
    isComfyUIAvailable().catch(() => false),
    getHealthStatus().catch(() => null),
  ]);

  return {
    comfyui: comfyuiAvailable,
    pollinations: true, // Always available (no API key)
    comfyuiModels: comfyuiHealth?.models || [],
    comfyuiQueue: {
      running: comfyuiHealth?.queueSize || 0,
      pending: 0,
    },
  };
}

export { SIZES };
export type { GenerateImageInput as ComfyUIInput, GenerateImageResult as ComfyUIResult };
