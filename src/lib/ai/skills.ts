// Skill System — Command-based content creation shortcuts
// Usage: /reel <topic>, /carousel <topic>, /story <topic>, etc.
// Each skill maps to a specific content generation pipeline.

import { aiContent } from "./router";
import { generateHook, getBestFrameworkForPlatform, type HookPlatform } from "./hooks";
import { generateVisualPrompt, type VisualPromptInput } from "./visual-director";
import { reviewContent, type Platform, type QualityScore } from "./quality-reviewer";
import {
  generateCarousel as genCarousel,
  generateReelScript as genReelScript,
  generateStory as genStory,
  generateThread as genThread,
  generatePoll as genPoll,
} from "./modules/brand-manager";

// ── Types ──────────────────────────────────────────────

export type SkillName =
  | "reel"
  | "carousel"
  | "story"
  | "post"
  | "thread"
  | "poll"
  | "moj"
  | "facebook"
  | "reddit"
  | "recruit"
  | "month"
  | "audit";

export interface SkillInput {
  topic: string;
  platform?: Platform;
  count?: number;
  style?: string;
  extra?: Record<string, string>;
}

export interface SkillResult {
  skill: SkillName;
  content: any;
  quality?: QualityScore;
  visual_prompt?: string;
  hooks?: string[];
  generated_at: string;
}

// ── Skill Definitions ──────────────────────────────────

export const SKILLS: Record<
  SkillName,
  {
    name: string;
    description: string;
    platform: Platform;
    contentType: string;
    emoji: string;
    example: string;
  }
> = {
  reel: {
    name: "reel",
    description: "Generate a viral Instagram/TikTok reel script with hook, scenes, and CTA",
    platform: "instagram",
    contentType: "reel",
    emoji: "🎬",
    example: "/reel 5 side hustles for college students",
  },
  carousel: {
    name: "carousel",
    description: "Generate a multi-slide Instagram carousel with images",
    platform: "instagram",
    contentType: "carousel",
    emoji: "🎠",
    example: "/carousel How to start live streaming in 2026",
  },
  story: {
    name: "story",
    description: "Generate Instagram story sequence with text and visuals",
    platform: "instagram",
    contentType: "story",
    emoji: "📱",
    example: "/story Behind the scenes of my streaming setup",
  },
  post: {
    name: "post",
    description: "Generate a standalone social media post",
    platform: "instagram",
    contentType: "post",
    emoji: "✍️",
    example: "/post Why I quit my job for live streaming",
  },
  thread: {
    name: "thread",
    description: "Generate a Twitter/LinkedIn thread",
    platform: "twitter",
    contentType: "thread",
    emoji: "🧵",
    example: "/thread 7 mistakes new creators make on TikTok",
  },
  poll: {
    name: "poll",
    description: "Generate an engagement poll",
    platform: "twitter",
    contentType: "poll",
    emoji: "📊",
    example: "/poll Best time to go live for Indian audience?",
  },
  moj: {
    name: "moj",
    description: "Generate Moj-optimized content (Hindi/regional, music-synced)",
    platform: "moj",
    contentType: "reel",
    emoji: "🎵",
    example: "/moj Dance trend for Poppo Live creators",
  },
  facebook: {
    name: "facebook",
    description: "Generate Facebook-optimized post (story-driven, shareable)",
    platform: "facebook",
    contentType: "post",
    emoji: "📘",
    example: "/facebook How live streaming changed my village",
  },
  reddit: {
    name: "reddit",
    description: "Generate Reddit-style post (authentic, value-first, no marketing)",
    platform: "twitter",
    contentType: "post",
    emoji: "🤖",
    example: "/reddit Honest review of Poppo Live as a creator",
  },
  recruit: {
    name: "recruit",
    description: "Generate recruitment/onboarding content for new creators",
    platform: "instagram",
    contentType: "carousel",
    emoji: "🤝",
    example: "/recruit Join BarbieVerse creator program",
  },
  month: {
    name: "month",
    description: "Generate a full monthly content calendar",
    platform: "instagram",
    contentType: "post",
    emoji: "📅",
    example: "/month Content plan for July 2026",
  },
  audit: {
    name: "audit",
    description: "Audit existing content for quality and improvement opportunities",
    platform: "instagram",
    contentType: "post",
    emoji: "🔍",
    example: "/audit Review my latest 5 posts for improvement",
  },
};

// ── Skill Executors ────────────────────────────────────

/**
 * Execute a skill by name with the given input.
 * Returns structured content with quality review.
 */
export async function executeSkill(
  skill: SkillName,
  input: SkillInput
): Promise<SkillResult> {
  const skillDef = SKILLS[skill];
  const platform = input.platform || skillDef.platform;

  console.log(`[Skill] Executing /${skill} — topic: "${input.topic}" on ${platform}`);

  let content: any;
  let visual_prompt: string | undefined;
  let hooks: string[] | undefined;

  switch (skill) {
    case "reel":
      content = await executeReelSkill(input, platform);
      hooks = [content.hook];
      break;

    case "carousel":
      content = await executeCarouselSkill(input, platform);
      break;

    case "story":
      content = await executeStorySkill(input, platform);
      break;

    case "post":
      content = await executePostSkill(input, platform);
      hooks = [content.hook || content.tweets?.[0] || ""];
      break;

    case "thread":
      content = await executeThreadSkill(input, platform);
      hooks = [content.tweets?.[0] || ""];
      break;

    case "poll":
      content = await executePollSkill(input, platform);
      break;

    case "moj":
      content = await executeMojSkill(input);
      hooks = [content.hook];
      break;

    case "facebook":
      content = await executeFacebookSkill(input);
      break;

    case "reddit":
      content = await executeRedditSkill(input);
      break;

    case "recruit":
      content = await executeRecruitSkill(input, platform);
      break;

    case "month":
      content = await executeMonthSkill(input);
      break;

    case "audit":
      content = await executeAuditSkill(input, platform);
      break;

    default:
      throw new Error(`Unknown skill: ${skill}`);
  }

  // Generate visual prompt for visual content types
  if (["reel", "carousel", "story", "moj"].includes(skill)) {
    try {
      const visualResult = await generateVisualPrompt({
        topic: input.topic,
        platform,
        contentType: skill === "moj" ? "reel" : (skill as any),
      });
      visual_prompt = visualResult.full_prompt;
    } catch (err) {
      console.error(`[Skill] Visual prompt generation failed:`, err);
    }
  }

  // Quality review
  let quality: QualityScore | undefined;
  try {
    const contentText = JSON.stringify(content).slice(0, 1000);
    quality = await reviewContent({
      content: contentText,
      platform,
      contentType: skill === "moj" ? "reel" : (skill as any),
      hook: hooks?.[0],
    });
  } catch (err) {
    console.error(`[Skill] Quality review failed:`, err);
  }

  return {
    skill,
    content,
    quality,
    visual_prompt,
    hooks,
    generated_at: new Date().toISOString(),
  };
}

// ── Individual Skill Executors ─────────────────────────

async function executeReelSkill(input: SkillInput, platform: Platform) {
  // Generate hook first
  const hookResult = await generateHook({
    topic: input.topic,
    platform: platform as HookPlatform,
    style: (input.style as any) || "educational",
  });

  // Generate reel script
  const script = await genReelScript({
    topic: input.topic,
    duration: (input.extra?.duration as any) || "30s",
    style: (input.style as any) || "educational",
    provider: "free",
  });

  return {
    ...script,
    hook: hookResult.hook,
    hook_framework: hookResult.framework,
  };
}

async function executeCarouselSkill(input: SkillInput, platform: Platform) {
  return genCarousel({
    topic: input.topic,
    slides: input.count || 7,
    style: (input.style as any) || "educational",
    provider: "free",
  });
}

async function executeStorySkill(input: SkillInput, platform: Platform) {
  return genStory({
    topic: input.topic,
    slides: input.count || 3,
    provider: "free",
  });
}

async function executePostSkill(input: SkillInput, platform: Platform) {
  const result = await aiContent(
    `Write a ${platform} post about: ${input.topic}

PLATFORM: ${platform}
STYLE: ${input.style || "authentic, conversational"}

REQUIREMENTS:
- Hook in first line (stop the scroll)
- 2-3 short paragraphs
- Specific numbers or examples
- Clear CTA (follow, comment, save, share)
- Match BarbieVerse brand voice (empowering, fun, authentic)
- ${platform === "twitter" ? "Under 280 chars" : "150-300 words"}

Return EXACTLY this JSON:
{
  "text": "the post text",
  "hook": "first line hook",
  "cta": "call to action text",
  "hashtags": ["relevant", "hashtags"]
}`,
    { maxTokens: 600 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { text: result.text, hook: "", cta: "", hashtags: [] };
}

async function executeThreadSkill(input: SkillInput, platform: Platform) {
  return genThread({
    topic: input.topic,
    platform: platform === "linkedin" ? "linkedin" : "twitter",
    tweets: input.count || 5,
    provider: "free",
  });
}

async function executePollSkill(input: SkillInput, platform: Platform) {
  return genPoll({
    topic: input.topic,
    platform: platform as "twitter" | "linkedin" | "instagram",
    provider: "free",
  });
}

async function executeMojSkill(input: SkillInput) {
  // Moj = TikTok-style but Hindi/regional, music-synced
  const hookResult = await generateHook({
    topic: input.topic,
    platform: "moj",
    style: "entertaining",
  });

  const script = await genReelScript({
    topic: input.topic,
    duration: "15s",
    style: "entertaining",
    provider: "free",
  });

  return {
    ...script,
    hook: hookResult.hook,
    hook_framework: hookResult.framework,
    platform: "moj",
    language_note: "Optimize for Hindi/regional language. Music-synced hooks perform best.",
  };
}

async function executeFacebookSkill(input: SkillInput) {
  const result = await aiContent(
    `Write a Facebook post about: ${input.topic}

STYLE: Story-driven, shareable, community-focused
LENGTH: 3-5 paragraphs (longer hooks work on Facebook)

REQUIREMENTS:
- Story-based hook (3-5 lines before the fold)
- Personal narrative style
- Community-focused messaging
- Nostalgia or emotional triggers
- Clear CTA (share, comment, tag someone)
- BarbieVerse brand voice (empowering, fun, authentic)

Return EXACTLY this JSON:
{
  "text": "the full post text",
  "hook": "the opening hook (first 3-5 lines)",
  "cta": "call to action",
  "hashtags": ["relevant", "hashtags"]
}`,
    { maxTokens: 800 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { text: result.text, hook: "", cta: "", hashtags: [] };
}

async function executeRedditSkill(input: SkillInput) {
  const result = await aiContent(
    `Write a Reddit post about: ${input.topic}

SUBRENDERDIT: r/IndianGaming or r/Streamers or r/Entrepreneur
STYLE: Authentic, value-first, no marketing speak

REQUIREMENTS:
- Title must be clickbait-free but curiosity-driven
- First paragraph: context/background
- Middle: specific tips, numbers, real examples
- End: genuine question to drive comments
- NO marketing language (no "check out", "join", "sign up")
- Sound like a real person sharing experience
- Use casual language, occasional humor

Return EXACTLY this JSON:
{
  "title": "Reddit post title",
  "body": "post body (2-4 paragraphs)",
  "subreddit": "suggested subreddit",
  "flair": "suggested flair"
}`,
    { maxTokens: 800 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "", body: result.text, subreddit: "IndianGaming", flair: "Discussion" };
}

async function executeRecruitSkill(input: SkillInput, platform: Platform) {
  const result = await aiContent(
    `Create a recruitment/onboarding carousel for new BarbieVerse creators about: ${input.topic}

PLATFORM: ${platform}
SLIDES: 7-10

CONTENT:
- Slide 1: Bold hook — why join BarbieVerse?
- Slides 2-6: Benefits, success stories, how it works, income potential
- Slide 7: CTA — how to join
- Each slide: headline + 1-2 sentences + image prompt

BRAND: BarbieVerse — empowering Indian creators to earn through live streaming
PLATFORMS: Poppo Live and Vone Live

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "slides": [
    {
      "headline": "punchy headline",
      "body": "1-2 sentences",
      "image_prompt": "visual description for AI image gen"
    }
  ],
  "caption": "post caption",
  "hashtags": ["relevant", "hashtags"]
}`,
    { maxTokens: 1200 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: input.topic, slides: [], caption: "", hashtags: [] };
}

async function executeMonthSkill(input: SkillInput) {
  const result = await aiContent(
    `Create a 30-day content calendar for BarbieVerse.

MONTH: ${input.topic || "Current month"}
PLATFORMS: Instagram, Twitter, YouTube, Moj
CONTENT MIX: 50% value, 30% engagement, 20% promotional

RULES:
- 2-3 posts per day across platforms
- Mix content types (reels, carousels, stories, threads, polls)
- Best posting times for Indian audience (10am, 1pm, 7pm IST)
- Include trending topics and seasonal events
- Each post builds on weekly theme
- Track content pillars: education, entertainment, inspiration, promotion

Return EXACTLY this JSON:
{
  "calendar": [
    {
      "day": 1,
      "date": "2026-07-01",
      "platform": "instagram",
      "content_type": "carousel",
      "topic": "specific topic",
      "pillar": "education"
    }
  ],
  "summary": "monthly content strategy overview",
  "key_themes": ["theme1", "theme2", "theme3"]
}`,
    { maxTokens: 4096 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { calendar: [], summary: "", key_themes: [] };
}

async function executeAuditSkill(input: SkillInput, platform: Platform) {
  const result = await aiContent(
    `Audit this content for quality and improvement opportunities.

CONTENT TO AUDIT:
${input.topic}

PLATFORM: ${platform}

AUDIT DIMENSIONS:
1. Hook effectiveness (first 1.5s / first line)
2. Content structure and flow
3. CTA presence and strength
4. Platform optimization
5. Brand consistency
6. Engagement potential
7. SEO/hashtag quality
8. Visual quality (if applicable)

Return EXACTLY this JSON:
{
  "overall_score": 72,
  "dimension_scores": {
    "hook": 80,
    "structure": 70,
    "cta": 55,
    "platform_optimization": 75,
    "brand_consistency": 85,
    "engagement_potential": 65,
    "seo_hashtags": 70,
    "visual_quality": 72
  },
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": [
    {
      "priority": "high",
      "issue": "description",
      "fix": "specific fix"
    }
  ],
  "verdict": "Good content with room for improvement. Focus on CTA and engagement."
}`,
    { maxTokens: 1200 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { overall_score: 50, verdict: "Manual review needed" };
}

// ── Utility Functions ──────────────────────────────────

/**
 * Parse a skill command from user input.
 * Example: "/reel 5 side hustles for college students" → { skill: "reel", topic: "5 side hustles..." }
 */
export function parseSkillCommand(input: string): { skill: SkillName | null; topic: string } {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/(\w+)\s+(.*)/);

  if (!match) {
    return { skill: null, topic: trimmed };
  }

  const skillName = match[1].toLowerCase() as SkillName;
  const topic = match[2].trim();

  if (skillName in SKILLS) {
    return { skill: skillName, topic };
  }

  return { skill: null, topic: trimmed };
}

/**
 * Get all available skills as a formatted list.
 */
export function listSkills(): string[] {
  return Object.entries(SKILLS).map(
    ([name, def]) => `${def.emoji} /${name} — ${def.description}\n   Example: ${def.example}`
  );
}

/**
 * Check if a string is a skill command.
 */
export function isSkillCommand(input: string): boolean {
  return input.trim().startsWith("/");
}
