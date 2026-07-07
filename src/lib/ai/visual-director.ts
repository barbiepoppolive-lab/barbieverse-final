// Visual Director — Structured prompt engineering for image/video generation
// Generates production-ready prompts with 8 dimensions:
// Character, Outfit, Camera, Lighting, Mood, Motion, Environment, Aspect Ratio
// Appends BarbieVerse luxury aesthetic to every prompt.

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
export type Mood = "cinematic" | "dramatic" | "ethereal" | "bold" | "moody" | "vibrant" | "minimal";
export type CameraAngle = "eye-level" | "low-angle" | "high-angle" | "dutch-angle" | "overhead" | "tracking";
export type LightingStyle = "golden-hour" | "studio-ring" | "neon-glow" | "soft-diffused" | "dramatic-side" | "backlit" | "natural";

export interface VisualPromptInput {
  topic: string;
  platform?: string;
  contentType?: "reel" | "carousel" | "story" | "thumbnail" | "post";
  aspect_ratio?: AspectRatio;
  mood?: Mood;
  character?: string;
  outfit?: string;
  camera?: CameraAngle;
  lighting?: LightingStyle;
  environment?: string;
  motion?: string;
  style?: "photorealistic" | "cinematic" | "editorial" | "artistic";
}

export interface VisualPromptResult {
  full_prompt: string;
  structured: {
    character: string;
    outfit: string;
    camera: string;
    lighting: string;
    mood: string;
    motion: string;
    environment: string;
    aspect_ratio: AspectRatio;
  };
  negative_prompt: string;
  style_tags: string[];
}

// ── Brand Aesthetic Constants ───────────────────────────

const BARBIEVERSE_AESTHETIC = `BarbieVerse luxury aesthetic: pink and black color palette, rose gold accents, cinematic lighting with soft bokeh, glamorous and feminine, professional studio quality, 8K ultra-detailed, dramatic lighting, elegant typography space, shallow depth of field, editorial fashion photography style, high-end beauty magazine quality, sparkle and shimmer effects, royal crown motifs, dark moody backgrounds with pink neon glow, premium luxury feel, photorealistic, hyperdetailed skin texture, studio ring light reflection in eyes, magazine cover quality`;

const NEGATIVE_PROMPT_BASE = `blurry, low quality, distorted face, extra fingers, bad anatomy, watermark, text overlay (unless requested), stock photo feel, generic, flat lighting, overexposed, underexposed, noisy, grainy, amateur, cheap, plastic, uncanny valley`;

// ── Platform Presets ───────────────────────────────────

const PLATFORM_PRESETS: Record<string, Partial<VisualPromptInput>> = {
  instagram: {
    aspect_ratio: "9:16",
    mood: "cinematic",
    camera: "eye-level",
    lighting: "studio-ring",
    style: "photorealistic",
  },
  tiktok: {
    aspect_ratio: "9:16",
    mood: "vibrant",
    camera: "eye-level",
    lighting: "neon-glow",
    style: "cinematic",
  },
  youtube: {
    aspect_ratio: "16:9",
    mood: "cinematic",
    camera: "tracking",
    lighting: "golden-hour",
    style: "cinematic",
  },
  twitter: {
    aspect_ratio: "16:9",
    mood: "bold",
    camera: "eye-level",
    lighting: "dramatic-side",
    style: "editorial",
  },
  moj: {
    aspect_ratio: "9:16",
    mood: "vibrant",
    camera: "eye-level",
    lighting: "natural",
    style: "photorealistic",
  },
  facebook: {
    aspect_ratio: "16:9",
    mood: "cinematic",
    camera: "eye-level",
    lighting: "soft-diffused",
    style: "photorealistic",
  },
  linkedin: {
    aspect_ratio: "16:9",
    mood: "minimal",
    camera: "eye-level",
    lighting: "studio-ring",
    style: "editorial",
  },
};

// ── Visual Director ────────────────────────────────────

/**
 * Generate a structured visual prompt with all 8 dimensions.
 * Automatically fills missing dimensions with smart defaults.
 */
export async function generateVisualPrompt(
  input: VisualPromptInput
): Promise<VisualPromptResult> {
  const platform = input.platform || "instagram";
  const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.instagram;

  // Merge defaults
  const merged: Required<VisualPromptInput> = {
    topic: input.topic,
    platform,
    contentType: input.contentType || "reel",
    aspect_ratio: input.aspect_ratio || preset.aspect_ratio || "9:16",
    mood: input.mood || preset.mood || "cinematic",
    character: input.character || "young Indian creator, confident expression, natural skin tone",
    outfit: input.outfit || "trendy streetwear, pink/black color scheme",
    camera: input.camera || preset.camera || "eye-level",
    lighting: input.lighting || preset.lighting || "studio-ring",
    environment: input.environment || "modern studio with pink neon accents",
    motion: input.motion || "subtle head tilt, engaging eye contact",
    style: input.style || preset.style || "photorealistic",
  };

  const result = await aiContent(
    `Generate a detailed visual prompt for AI image/video generation.

TOPIC: ${merged.topic}
PLATFORM: ${merged.platform}
CONTENT TYPE: ${merged.contentType}
STYLE: ${merged.style}

DIMENSIONS TO FILL (be specific and vivid):

1. CHARACTER: Who is in the scene? (${merged.character})
2. OUTFIT: What are they wearing? Be specific about colors, textures, brands. (${merged.outfit})
3. CAMERA: Angle, movement, framing. (${merged.camera})
4. LIGHTING: Specific lighting setup. (${merged.lighting})
5. MOOD: Overall feeling and atmosphere. (${merged.mood})
6. MOTION: What's happening? Body language, movement. (${merged.motion})
7. ENVIRONMENT: Where is this? Background details. (${merged.environment})
8. ASPECT RATIO: ${merged.aspect_ratio}

RULES:
- Be hyper-specific (not "nice lighting" but "golden hour side lighting with rim light on hair")
- Use sensory language (colors, textures, light quality)
- Include camera-specific terms (depth of field, focal length, framing)
- Match ${merged.platform} platform norms
- Maintain BarbieVerse luxury aesthetic throughout
- Every prompt must feel premium and aspirational

Return EXACTLY this JSON:
{
  "character": "detailed character description",
  "outfit": "detailed outfit description with colors and textures",
  "camera": "specific camera angle, movement, and framing",
  "lighting": "detailed lighting setup",
  "mood": "atmosphere and feeling",
  "motion": "action and movement description",
  "environment": "detailed background and setting",
  "style_tags": ["tag1", "tag2", "tag3"]
}`,
    { maxTokens: 800 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackPrompt(merged);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Build the full prompt by combining all dimensions
  const full_prompt = [
    parsed.character || merged.character,
    parsed.outfit || merged.outfit,
    parsed.environment || merged.environment,
    parsed.camera || merged.camera,
    parsed.lighting || merged.lighting,
    parsed.mood || merged.mood,
    parsed.motion || merged.motion,
    `, ${BARBIEVERSE_AESTHETIC}`,
  ].join(". ");

  const negative_prompt = `${NEGATIVE_PROMPT_BASE}, ${merged.aspect_ratio === "9:16" ? "landscape, horizontal" : merged.aspect_ratio === "16:9" ? "portrait, vertical" : ""}`;

  return {
    full_prompt: full_prompt.trim(),
    structured: {
      character: parsed.character || merged.character,
      outfit: parsed.outfit || merged.outfit,
      camera: parsed.camera || merged.camera,
      lighting: parsed.lighting || merged.lighting,
      mood: parsed.mood || merged.mood,
      motion: parsed.motion || merged.motion,
      environment: parsed.environment || merged.environment,
      aspect_ratio: merged.aspect_ratio,
    },
    negative_prompt: negative_prompt.trim(),
    style_tags: parsed.style_tags || ["cinematic", "luxury", "barbieverse"],
  };
}

/**
 * Generate video-specific visual prompts (with motion and scene progression).
 */
export async function generateVideoVisualPrompt(
  input: VisualPromptInput & { duration?: number; scenes?: number }
): Promise<{
  scenes: VisualPromptResult[];
  overall_mood: string;
  color_palette: string[];
  music_mood: string;
}> {
  const numScenes = input.scenes || 3;
  const scenes: VisualPromptResult[] = [];

  for (let i = 0; i < numScenes; i++) {
    const sceneResult = await generateVisualPrompt({
      ...input,
      topic: `${input.topic} — scene ${i + 1} of ${numScenes}`,
    });
    scenes.push(sceneResult);
  }

  // Generate overall mood and color palette
  const moodResult = await aiContent(
    `For a ${input.duration || 5}-second ${input.platform || "instagram"} reel about "${input.topic}":

Return EXACTLY this JSON:
{
  "overall_mood": "one word describing the overall mood",
  "color_palette": ["hex1", "hex2", "hex3", "hex4"],
  "music_mood": "music style that fits this video"
}`,
    { maxTokens: 200 }
  );

  const moodJson = moodResult.text.match(/\{[\s\S]*\}/);
  const moodParsed = moodJson ? JSON.parse(moodJson[0]) : {};

  return {
    scenes,
    overall_mood: moodParsed.overall_mood || "cinematic",
    color_palette: moodParsed.color_palette || ["#FF69B4", "#1A1A2E", "#C0C0C0", "#FFD700"],
    music_mood: moodParsed.music_mood || "trending electronic",
  };
}

/**
 * Get platform-specific visual presets.
 */
export function getVisualPreset(platform: string): Partial<VisualPromptInput> {
  return PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.instagram;
}

/**
 * Quick visual prompt for rapid generation (no AI call).
 */
export function quickVisualPrompt(
  topic: string,
  platform: string = "instagram"
): string {
  const preset = PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.instagram;
  return `A ${preset.mood || "cinematic"} ${preset.style || "photorealistic"} shot of ${topic}. ${preset.camera || "eye-level"} angle, ${preset.lighting || "studio-ring"} lighting, ${preset.environment || "modern studio with pink neon accents"}. ${BARBIEVERSE_AESTHETIC}`;
}

// ── Helpers ────────────────────────────────────────────

function fallbackPrompt(merged: Required<VisualPromptInput>): VisualPromptResult {
  const full_prompt = `A ${merged.style} ${merged.mood} shot of ${merged.topic}. ${merged.character} wearing ${merged.outfit}. ${merged.camera} camera angle, ${merged.lighting} lighting, ${merged.environment}. ${merged.motion}. ${BARBIEVERSE_AESTHETIC}`;

  return {
    full_prompt,
    structured: {
      character: merged.character,
      outfit: merged.outfit,
      camera: merged.camera,
      lighting: merged.lighting,
      mood: merged.mood,
      motion: merged.motion,
      environment: merged.environment,
      aspect_ratio: merged.aspect_ratio,
    },
    negative_prompt: NEGATIVE_PROMPT_BASE,
    style_tags: ["cinematic", "luxury", "barbieverse"],
  };
}
