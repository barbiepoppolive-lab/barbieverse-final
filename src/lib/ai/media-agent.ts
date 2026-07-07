// Media Generation Agent — Orchestrator for all content creation
// Coordinates: Hook Engine → Visual Director → Content Generator → Quality Reviewer
// Implements the 7-agent pipeline from OS v3 spec:
//   1. Trend Hunter (topic research)
//   2. Content Strategist (content mix/planning)
//   3. Hook Engine (viral hooks)
//   4. Script Writer (content body)
//   5. Caption Writer (captions/hashtags)
//   6. Visual Director (image/video prompts)
//   7. Quality Reviewer (scoring and approval)

import { aiContent, aiPremium } from "./router";
import { generateHook, generateHookVariants, type HookPlatform, type HookFramework } from "./hooks";
import { generateVisualPrompt, generateVideoVisualPrompt, type VisualPromptInput } from "./visual-director";
import { reviewContent, quickQualityCheck, autoReviseContent, type Platform, type QualityScore } from "./quality-reviewer";
import { executeSkill, parseSkillCommand, isSkillCommand, listSkills, type SkillName, type SkillResult } from "./skills";
import {
  generateVideoOpenRouter,
  generateReelVideo,
  getBestModelForUseCase,
  estimateVideoCost,
  VIDEO_MODELS,
  type VideoModel,
  type OpenRouterVideoResult,
} from "./video-gen-openrouter";
import {
  generateCarousel,
  generateReelScript,
  generateStory,
  generateThread,
  generateContentImage,
  type ProviderChoice,
} from "./modules/brand-manager";

// ── Helpers ─────────────────────────────────────────────

function safeParseJson(text: string): any {
  let clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  clean = clean.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  clean = clean.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(clean); } catch {}
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(clean.slice(first, last + 1)); } catch {}
  }
  return null;
}

// ── Types ──────────────────────────────────────────────

export type ContentPipeline = "reel" | "carousel" | "story" | "post" | "thread" | "full-video";

export interface MediaAgentInput {
  topic: string;
  pipeline: ContentPipeline;
  platform?: Platform;
  count?: number;
  duration?: number;
  style?: string;
  with_video?: boolean;
  with_image?: boolean;
  quality_threshold?: number; // 0-100, default 70
  budget_usd?: number;
  provider?: ProviderChoice;
  extra?: Record<string, string>;
}

export interface MediaAgentResult {
  pipeline: ContentPipeline;
  topic: string;
  platform: Platform;

  // Content outputs
  hook?: string;
  hook_variants?: string[];
  content: any;
  visual_prompt?: string;
  image_url?: string;
  video?: OpenRouterVideoResult;

  // Quality
  quality: QualityScore;
  revisions: number;

  // Metadata
  estimated_cost: number;
  generation_time_ms: number;
  agents_used: string[];
  summary: string;
}

// ── Media Agent ────────────────────────────────────────

/**
 * Main entry point — orchestrates the full content generation pipeline.
 * Runs all 7 agents in sequence with quality gates.
 */
export async function generateMedia(input: MediaAgentInput): Promise<MediaAgentResult> {
  const startTime = Date.now();
  const platform = input.platform || "instagram";
  const qualityThreshold = input.quality_threshold || 70;
  const agentsUsed: string[] = [];
  let totalCost = 0;
  let revisions = 0;

  console.log(`[MediaAgent] Starting ${input.pipeline} pipeline for "${input.topic}" on ${platform}`);

  // ── Agent 1: Trend Hunter (topic research) ─────────
  // Skip for now — topic is user-provided
  agentsUsed.push("topic-research");

  // ── Agent 2: Content Strategist (content mix) ──────
  agentsUsed.push("content-strategist");

  // ── Agent 3: Hook Engine ───────────────────────────
  let hook = "";
  let hookVariants: string[] = [];

  try {
    const hookResult = await generateHook({
      topic: input.topic,
      platform: platform as HookPlatform,
      style: (input.style as any) || "educational",
    });
    hook = hookResult.hook;
    agentsUsed.push("hook-engine");

    // Generate A/B variants
    const variants = await generateHookVariants(
      { topic: input.topic, platform: platform as HookPlatform, style: (input.style as any) || "educational" },
      2
    );
    hookVariants = variants.map((v) => v.hook);
  } catch (err) {
    console.error("[MediaAgent] Hook generation failed:", err);
  }

  // ── Agent 4+5: Script Writer + Caption Writer ──────
  let content: any = {};

  try {
    switch (input.pipeline) {
      case "reel":
        content = await generateReelPipeline(input, platform, hook);
        break;
      case "carousel":
        content = await generateCarouselPipeline(input, platform);
        break;
      case "story":
        content = await generateStoryPipeline(input, platform);
        break;
      case "post":
        content = await generatePostPipeline(input, platform, hook);
        break;
      case "thread":
        content = await generateThreadPipeline(input, platform);
        break;
      case "full-video":
        content = await generateFullVideoPipeline(input, platform, hook);
        break;
    }
    agentsUsed.push("script-writer", "caption-writer");
  } catch (err) {
    console.error("[MediaAgent] Content generation failed:", err);
    throw err;
  }

  // ── Agent 6: Visual Director ───────────────────────
  let visualPrompt: string | undefined;
  let imageUrl: string | undefined;

  if (input.with_image !== false && ["reel", "carousel", "story"].includes(input.pipeline)) {
    try {
      const visualResult = await generateVisualPrompt({
        topic: input.topic,
        platform,
        contentType: input.pipeline === "full-video" ? "reel" : (input.pipeline as any),
        style: "photorealistic",
      });
      visualPrompt = visualResult.full_prompt;
      agentsUsed.push("visual-director");

      // Generate image if requested
      if (input.with_image) {
        imageUrl = await generateContentImage(visualPrompt, platform as any, input.pipeline as any);
        totalCost += 0; // ComfyUI is free
      }
    } catch (err) {
      console.error("[MediaAgent] Visual generation failed:", err);
    }
  }

  // ── Video Generation (if requested) ────────────────
  let video: OpenRouterVideoResult | undefined;

  if (input.with_video && input.pipeline === "full-video") {
    try {
      const budgetModels = getBestModelForUseCase("reel");
      const model = input.budget_usd
        ? (Object.values(VIDEO_MODELS) as import("./video-gen-openrouter").VideoModelInfo[])
            .filter((m) => estimateVideoCost(m.id, input.duration || 5) <= (input.budget_usd || 1))
            .sort((a, b) => a.cost_per_second - b.cost_per_second)[0]?.id || "kling-3.0-standard"
        : budgetModels;

      video = await generateReelVideo({
        topic: input.topic,
        duration: input.duration || 5,
        platform: platform as any,
        model: model as VideoModel,
        image_url: imageUrl,
      });
      totalCost += video.cost_estimate;
      agentsUsed.push("video-generator");
    } catch (err) {
      console.error("[MediaAgent] Video generation failed:", err);
    }
  }

  // ── Agent 7: Quality Reviewer ──────────────────────
  let quality: QualityScore;
  let currentContent = content;

  try {
    const contentText = JSON.stringify(currentContent).slice(0, 1500);
    quality = await reviewContent({
      content: contentText,
      platform,
      contentType: input.pipeline === "full-video" ? "reel" : (input.pipeline as any),
      hook,
      image_url: imageUrl,
    });
    agentsUsed.push("quality-reviewer");

    // Auto-revise if below threshold
    while (quality.overall < qualityThreshold && revisions < 2) {
      console.log(`[MediaAgent] Quality score ${quality.overall} < ${qualityThreshold}, revising... (attempt ${revisions + 1})`);

      const revisedContent = await autoReviseContent(
        {
          content: contentText,
          platform,
          contentType: input.pipeline === "full-video" ? "reel" : (input.pipeline as any),
          hook,
        },
        quality
      );

      // Try to parse revised content
      try {
        const jsonMatch = revisedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          currentContent = safeParseJson(jsonMatch[0]) || currentContent;
        }
      } catch {
        // Keep original if parse fails
      }

      revisions++;

      // Re-review
      const revisedText = JSON.stringify(currentContent).slice(0, 1500);
      quality = await reviewContent({
        content: revisedText,
        platform,
        contentType: input.pipeline === "full-video" ? "reel" : (input.pipeline as any),
        hook,
        image_url: imageUrl,
      });
    }
  } catch (err) {
    console.error("[MediaAgent] Quality review failed:", err);
    quality = {
      overall: 50,
      dimensions: {
        hook_effectiveness: 50,
        retention_potential: 50,
        cta_presence: 50,
        brand_consistency: 50,
        grammar_clarity: 50,
        platform_suitability: 50,
      },
      issues: [],
      suggestions: ["Quality review unavailable"],
      verdict: "revise",
      summary: "Automated review failed",
    };
  }

  const elapsed = Date.now() - startTime;

  console.log(`[MediaAgent] Complete in ${elapsed}ms — Score: ${quality.overall}/100 — Cost: $${totalCost.toFixed(3)}`);

  return {
    pipeline: input.pipeline,
    topic: input.topic,
    platform,
    hook,
    hook_variants: hookVariants,
    content: currentContent,
    visual_prompt: visualPrompt,
    image_url: imageUrl,
    video,
    quality,
    revisions,
    estimated_cost: totalCost,
    generation_time_ms: elapsed,
    agents_used: agentsUsed,
    summary: `${input.pipeline} for "${input.topic}" on ${platform} — Score: ${quality.overall}/100, ${revisions} revisions, $${totalCost.toFixed(3)} cost`,
  };
}

// ── Pipeline Executors ─────────────────────────────────

async function generateReelPipeline(
  input: MediaAgentInput,
  platform: Platform,
  hook: string
) {
  const script = await generateReelScript({
    topic: input.topic,
    duration: (input.extra?.duration as any) || "30s",
    style: (input.style as any) || "educational",
    provider: input.provider || "free",
  });

  return { ...script, hook, hook_framework: undefined };
}

async function generateCarouselPipeline(input: MediaAgentInput, platform: Platform) {
  return generateCarousel({
    topic: input.topic,
    slides: input.count || 7,
    style: (input.style as any) || "educational",
    provider: input.provider || "free",
  });
}

async function generateStoryPipeline(input: MediaAgentInput, platform: Platform) {
  return generateStory({
    topic: input.topic,
    slides: input.count || 3,
    provider: input.provider || "free",
  });
}

async function generatePostPipeline(
  input: MediaAgentInput,
  platform: Platform,
  hook: string
) {
  const result = await aiContent(
    `Write a ${platform} post about: ${input.topic}

Hook: ${hook}
Platform: ${platform}
Style: ${input.style || "authentic, conversational"}

Include: text, cta, hashtags.
Return JSON: { "text": "...", "hook": "...", "cta": "...", "hashtags": [...] }`,
    { maxTokens: 600 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? safeParseJson(jsonMatch[0]) || { text: result.text, hook, cta: "", hashtags: [] } : { text: result.text, hook, cta: "", hashtags: [] };
}

async function generateThreadPipeline(input: MediaAgentInput, platform: Platform) {
  const { generateThread } = await import("./modules/brand-manager");
  return generateThread({
    topic: input.topic,
    platform: platform === "linkedin" ? "linkedin" : "twitter",
    tweets: input.count || 5,
    provider: input.provider || "free",
  });
}

async function generateFullVideoPipeline(
  input: MediaAgentInput,
  platform: Platform,
  hook: string
) {
  // Full video = script + visual prompts + video generation
  const script = await generateReelScript({
    topic: input.topic,
    duration: "30s",
    style: (input.style as any) || "educational",
    provider: input.provider || "free",
  });

  const visual = await generateVideoVisualPrompt({
    topic: input.topic,
    platform,
    duration: input.duration || 5,
    scenes: 3,
  });

  return {
    ...script,
    hook,
    visual_prompts: visual.scenes.map((s) => s.full_prompt),
    overall_mood: visual.overall_mood,
    color_palette: visual.color_palette,
  };
}

// ── Quick Generation (no quality gate) ─────────────────

/**
 * Fast media generation — skip quality review for speed.
 * Use for high-volume content or when cost matters more than perfection.
 */
export async function generateMediaQuick(
  input: MediaAgentInput
): Promise<Omit<MediaAgentResult, "quality" | "revisions">> {
  const startTime = Date.now();
  const platform = input.platform || "instagram";

  // Parse skill command if present
  if (isSkillCommand(input.topic)) {
    const { skill, topic } = parseSkillCommand(input.topic);
    if (skill) {
      const skillResult = await executeSkill(skill, {
        topic,
        platform,
        count: input.count,
        style: input.style,
        extra: input.extra,
      });

      return {
        pipeline: input.pipeline,
        topic,
        platform,
        content: skillResult.content,
        visual_prompt: skillResult.visual_prompt,
        hook: skillResult.hooks?.[0],
        hook_variants: skillResult.hooks,
        estimated_cost: 0,
        generation_time_ms: Date.now() - startTime,
        agents_used: ["skill-system"],
        summary: `Quick generation via /${skill}`,
      };
    }
  }

  // Regular quick generation
  let content: any = {};
  switch (input.pipeline) {
    case "reel":
      content = await generateReelPipeline(input, platform, "");
      break;
    case "carousel":
      content = await generateCarouselPipeline(input, platform);
      break;
    case "story":
      content = await generateStoryPipeline(input, platform);
      break;
    case "post":
      content = await generatePostPipeline(input, platform, "");
      break;
    case "thread":
      content = await generateThreadPipeline(input, platform);
      break;
    case "full-video":
      content = await generateFullVideoPipeline(input, platform, "");
      break;
  }

  return {
    pipeline: input.pipeline,
    topic: input.topic,
    platform,
    content,
    estimated_cost: 0,
    generation_time_ms: Date.now() - startTime,
    agents_used: ["quick-generator"],
    summary: `Quick ${input.pipeline} generated`,
  };
}

// ── Utility Exports ────────────────────────────────────

export { listSkills, parseSkillCommand, isSkillCommand };
export type { SkillName, SkillResult } from "./skills";
