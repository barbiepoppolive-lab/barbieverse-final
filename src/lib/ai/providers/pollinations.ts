// Pollinations.ai — Free image generation (no API key needed)
// https://pollinations.ai

export type ImageSize = { width: number; height: number };

export const SIZES: Record<string, ImageSize> = {
  square: { width: 1024, height: 1024 },
  landscape: { width: 1344, height: 768 },
  portrait: { width: 768, height: 1344 },
  story: { width: 1080, height: 1920 },
  thumbnail: { width: 1280, height: 720 },
  banner: { width: 1584, height: 396 },
  carousel: { width: 1080, height: 1080 },
};

export interface GenerateImageInput {
  prompt: string;
  size?: keyof typeof SIZES | ImageSize;
  seed?: number;
  model?: "flux" | "turbo";
  enhance?: boolean;
}

export interface GenerateImageResult {
  url: string;
  width: number;
  height: number;
}

export function generateImageUrl(input: GenerateImageInput): GenerateImageResult {
  const size = typeof input.size === "string"
    ? SIZES[input.size] || SIZES.square
    : input.size || SIZES.square;

  const model = input.model || "flux";
  const seed = input.seed || Math.floor(Math.random() * 999999);
  const enhance = input.enhance !== false ? "true" : "false";

  const encodedPrompt = encodeURIComponent(input.prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${size.width}&height=${size.height}&seed=${seed}&model=${model}&nologo=true&enhance=${enhance}`;

  return { url, width: size.width, height: size.height };
}

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
