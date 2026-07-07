// AI Brand Manager — Virtual social media manager for BarbieVerse
// Generates ALL content types — choose Free or Premium provider

import { aiContent, aiPremium } from "../router";
import { generateImageUrl, SIZES } from "../providers/pollinations";
import {
  generateImage as generateImageFull,
  getProviderStatus,
  type ImageGenInput,
} from "../image-gen";
import {
  recommendMusic,
  type MusicTrack,
  type MusicRecommendation,
  type MusicMood,
  type MusicGenre,
} from "../music";
import { generateContentSEO, type ContentSEO, type Platform } from "../content-seo";

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

// Inline types (audio-gen.server.ts removed from client bundle)
type AudioGenResult = { audioPath: string; audioUrl: string; voice: string; sizeKb: number; subtitlePath?: string; subtitleUrl?: string };
type CarouselAudio = { slides: { text: string; audioUrl: string }[]; fullNarration: { audioUrl: string; duration: string } };

// ── Helper: Choose provider based on user selection ────

export type ProviderChoice = "premium" | "free";

function aiGenerate(prompt: string, systemPrompt: string, provider: ProviderChoice = "free") {
  if (provider === "premium") {
    return aiPremium(prompt, { systemPrompt, maxTokens: 4096 });
  }
  return aiContent(prompt, { systemPrompt, maxTokens: 4096 });
}

// ── Types ──────────────────────────────────────────────

export type ContentPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";

export type ContentType =
  | "carousel"
  | "reel_script"
  | "thumbnail"
  | "story"
  | "blog_post"
  | "social_post"
  | "thread"
  | "poll";

export type ContentStatus = "draft" | "approved" | "scheduled" | "published" | "failed";

export interface ContentItem {
  id: string;
  type: ContentType;
  platform: ContentPlatform;
  status: ContentStatus;
  title: string;
  body: string;
  hashtags: string[];
  image_url?: string;
  image_prompt?: string;
  scheduled_for?: string;
  published_at?: string;
  engagement?: { likes: number; comments: number; shares: number; views: number };
  created_at: string;
  updated_at: string;
}

export interface CarouselSlide {
  headline: string;
  body: string;
  image_prompt: string;
  image_url?: string;
}

export interface CarouselWithAudio {
  title: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  audio?: CarouselAudio;
  music?: MusicRecommendation;
}

export interface ReelScript {
  hook: string;
  scenes: { duration: string; visual: string; audio: string; text_overlay: string }[];
  caption: string;
  hashtags: string[];
  music_suggestion: string;
}

export interface ReelScriptWithAudio extends ReelScript {
  audio?: { scenes: AudioGenResult[]; full: AudioGenResult };
  music?: MusicRecommendation;
}

export interface ContentCalendarEntry {
  date: string;
  platform: ContentPlatform;
  content_type: ContentType;
  topic: string;
  status: ContentStatus;
  content_id?: string;
}

// ── Brand Voice Constants ──────────────────────────────

const BRAND_VOICE = `You are the AI Brand Manager for BarbieVerse — a creator economy platform helping young Indian creators earn money through live streaming on Poppo Live and Vone Live.

BRAND PERSONALITY:
- Empowering, not preachy — you lift people up, never talk down
- Fun, not childish — playful energy with substance
- Authentic, not polished — real talk beats corporate speak
- Helpful, not salesy — give value first, promote second
- Direct, not aggressive — clear and confident

TARGET AUDIENCE:
- Young Indian creators (18-30)
- Tech-savvy but skeptical of scams
- Value authenticity over polish
- Want real income, not "exposure"
- Use Instagram, Twitter, YouTube, LinkedIn

CONTENT RULES:
1. HOOK FIRST — first line must stop the scroll
2. 80% value, 20% promotion
3. Use specific numbers and real examples
4. Short paragraphs (2-3 sentences)
5. End with clear CTA
6. Never use: leverage, synergy, unlock, gamify, disruptive
7. Always sound like a real person, not a brand`;

// ── Brand Visual Identity (append to ALL image prompts) ──

const BRAND_AESTHETIC = `BarbieVerse brand aesthetic: luxurious pink and black color palette, rose gold accents, cinematic lighting with soft bokeh, glamorous and feminine, professional studio quality, 8K ultra-detailed, dramatic lighting, elegant typography space, shallow depth of field, editorial fashion photography style, high-end beauty magazine quality, sparkle and shimmer effects, royal crown motifs, dark moody backgrounds with pink neon glow, premium luxury feel, photorealistic, hyperdetailed skin texture, studio ring light reflection in eyes, magazine cover quality`;

// ── SEO Enrichment Helper ──────────────────────────────

async function enrichWithSEO(
  content: any,
  title: string,
  topic: string,
  platform: Platform,
  contentType: string,
): Promise<any> {
  try {
    const seo = await generateContentSEO({
      title,
      content: JSON.stringify(content),
      topic,
      platform,
      content_type: contentType,
    });
    return { ...content, seo };
  } catch (err) {
    console.error("[BrandManager] SEO enrichment failed:", err);
    return content;
  }
}

// ── Carousel Generator ─────────────────────────────────

export async function generateCarousel(input: {
  topic: string;
  slides?: number;
  style?: "educational" | "storytelling" | "listicle" | "tips";
  provider?: ProviderChoice;
  withAudio?: boolean;
}): Promise<CarouselWithAudio> {
  const numSlides = input.slides || 7;
  const style = input.style || "educational";
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Create an Instagram carousel post about: ${input.topic}

STYLE: ${style}
NUMBER OF SLIDES: ${numSlides}

REQUIREMENTS:
- Slide 1: Bold hook headline + short subtitle (this is the cover) — this MUST have a caption/text overlay described in image_prompt
- Slides 2-${numSlides - 1}: One key point per slide with headline + 1-2 sentences
- Last slide: Strong CTA slide with brand handle @barbieverse
- Each slide needs a VISUAL image description for AI image generation
- Keep text minimal — Instagram carousels work best with 30-50 words per slide
- Write in a conversational, empowering tone
- EVERY image_prompt MUST describe a pink/black/gold color palette, cinematic lighting, and professional quality
- The first slide image_prompt must describe a bold, eye-catching cover with text space

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "slides": [
    {
      "headline": "short punchy headline",
      "body": "1-2 sentences max",
      "image_prompt": "detailed scene description — pink and black color palette, rose gold accents, cinematic studio lighting, glamorous, 8K quality, editorial photography, professional, text overlay space for headline"
    }
  ],
  "caption": "Instagram caption for this carousel",
  "hashtags": ["relevant", "hashtags"]
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse carousel content");
  const parsed = safeParseJson(jsonMatch[0]);

  const carousel: CarouselWithAudio = {
    title: parsed.title || input.topic,
    slides: parsed.slides || [],
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
  };

  // Generate images for each slide
  if (carousel.slides.length > 0) {
    try {
      for (let i = 0; i < carousel.slides.length; i++) {
        const slide = carousel.slides[i];
        if (slide.image_prompt) {
          slide.image_url = await generateContentImage(slide.image_prompt, "instagram", "carousel");
        }
      }
    } catch (err) {
      console.error("[BrandManager] Slide image generation failed:", err);
    }
  }

  // Generate audio narration if requested
  if (input.withAudio && carousel.slides.length > 0) {
    try {
      // Audio generated server-side via API route
    } catch (err) {
      console.error("[BrandManager] Audio generation failed:", err);
    }
  }

  // Get AI music recommendation
  try {
    carousel.music = await recommendMusic({
      contentType: "carousel",
      topic: input.topic,
      platform: "instagram",
    });
  } catch (err) {
    console.error("[BrandManager] Music recommendation failed:", err);
  }

  // Enrich with SEO data
  return enrichWithSEO(carousel, carousel.title, input.topic, "instagram", "carousel");
}

// ── Reel Script Generator ──────────────────────────────

export async function generateReelScript(input: {
  topic: string;
  duration?: "15s" | "30s" | "60s" | "90s";
  style?: "educational" | "entertaining" | "inspirational" | "behind-the-scenes";
  provider?: ProviderChoice;
  withAudio?: boolean;
}): Promise<ReelScriptWithAudio> {
  const duration = input.duration || "30s";
  const style = input.style || "educational";
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Write a reel/video script about: ${input.topic}

DURATION: ${duration}
STYLE: ${style}

REQUIREMENTS:
- Hook in first 3 seconds (must stop the scroll)
- 3-5 scenes with clear visual/audio directions
- Include text overlay suggestions for each scene
- Suggest trending audio/music style
- End with CTA (follow, comment, save, share)
- Write like a real creator, not a brand

Return EXACTLY this JSON:
{
  "hook": "first 3 second hook line",
  "scenes": [
    {
      "duration": "0-3s",
      "visual": "what to show on screen",
      "audio": "voiceover text or music",
      "text_overlay": "text that appears on screen"
    }
  ],
  "caption": "post caption",
  "hashtags": ["relevant", "hashtags"],
  "music_suggestion": "trending audio style",
  "cover_prompt": "reel cover thumbnail — BarbieVerse pink/black aesthetic, glamorous creator portrait, cinematic lighting, rose gold accents, 8K, magazine cover quality"
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse reel script");
  const parsed = safeParseJson(jsonMatch[0]);

  const reel: ReelScriptWithAudio = {
    hook: parsed.hook || "",
    scenes: parsed.scenes || [],
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
    music_suggestion: parsed.music_suggestion || "",
  };

  // Generate voiceover audio if requested
  if (input.withAudio && reel.scenes.length > 0) {
    try {
      const sceneTexts = reel.scenes
        .map((s) => s.audio)
        .filter((a) => a && !a.startsWith("[") && !a.toLowerCase().includes("music"));

      if (sceneTexts.length > 0) {
        // Audio generated server-side via cron
      }
    } catch (err) {
      console.error("[BrandManager] Reel audio generation failed:", err);
    }
  }

  // Get AI music recommendation
  try {
    reel.music = await recommendMusic({
      contentType: "reel",
      topic: input.topic,
      platform: "instagram",
    });
  } catch (err) {
    console.error("[BrandManager] Music recommendation failed:", err);
  }

  // Enrich with SEO data
  return enrichWithSEO(reel, reel.hook || input.topic, input.topic, "instagram", "reel_script");
}

// ── Thumbnail Generator ────────────────────────────────

export async function generateThumbnail(input: {
  title: string;
  style?: "bold" | "clean" | "dramatic" | "playful";
  provider?: ProviderChoice;
}): Promise<{ image_url: string; image_prompt: string }> {
  const style = input.style || "bold";
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Create an image prompt for a YouTube/blog thumbnail about: ${input.title}

STYLE: ${style}
REQUIREMENTS:
- Eye-catching and clickable — must stop the scroll
- Bold text-friendly composition (space for text overlay)
- BarbieVerse pink/black/gold color palette, rose gold accents
- Cinematic lighting, dramatic shadows
- Professional editorial quality, 8K
- 16:9 aspect ratio
- Glamorous, luxury feel

Return EXACTLY this JSON:
{
  "image_prompt": "detailed scene description — BarbieVerse aesthetic, pink and black palette, rose gold accents, cinematic lighting, glamorous, 8K, editorial, professional, text overlay space, dramatic"
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse thumbnail prompt");
  const parsed = safeParseJson(jsonMatch[0]);

  const imageResult = generateImageUrl({
    prompt: parsed.image_prompt || input.title,
    size: "thumbnail",
    model: "flux",
  });

  return enrichWithSEO({
    image_url: imageResult.url,
    image_prompt: parsed.image_prompt || "",
  }, input.title, input.title, "instagram", "thumbnail");
}

// ── Story Generator ────────────────────────────────────

export async function generateStory(input: {
  topic: string;
  slides?: number;
  provider?: ProviderChoice;
  withAudio?: boolean;
}): Promise<{ slides: { text: string; image_prompt: string; cta?: string }[]; audio?: { slides: AudioGenResult[]; full: AudioGenResult } }> {
  const numSlides = input.slides || 3;
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Create an Instagram story sequence about: ${input.topic}

NUMBER OF SLIDES: ${numSlides}

REQUIREMENTS:
- Each slide: short punchy text (max 2 lines) + image prompt
- First slide: hook/curiosity
- Middle slides: value/tips
- Last slide: CTA (swipe up, link, DM)
- Vertical format (9:16)
- Bold, minimal text
- High energy
- ALL image_prompts MUST use BarbieVerse pink/black/gold aesthetic

Return EXACTLY this JSON:
{
  "slides": [
    {
      "text": "short text on slide",
      "image_prompt": "background scene — BarbieVerse pink/black aesthetic, cinematic lighting, rose gold accents, glamorous, 8K, professional, vertical 9:16",
      "cta": "optional call to action"
    }
  ]
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse story content");
  const parsed = safeParseJson(jsonMatch[0]);

  const storySlides = parsed.slides || [];
  const storyResult: { slides: (typeof storySlides)[0] & { image_url?: string }[]; audio?: { slides: AudioGenResult[]; full: AudioGenResult }; music?: MusicRecommendation } = { slides: storySlides };

  // Generate images for each story slide
  if (storySlides.length > 0) {
    try {
      for (let i = 0; i < storySlides.length; i++) {
        const slide = storySlides[i];
        if (slide.image_prompt) {
          slide.image_url = await generateContentImage(slide.image_prompt, "instagram", "story");
        }
      }
    } catch (err) {
      console.error("[BrandManager] Story image generation failed:", err);
    }
  }

  // Generate audio if requested
  if (input.withAudio && storySlides.length > 0) {
    try {
      // Audio generated server-side via API route
    } catch (err) {
      console.error("[BrandManager] Story audio generation failed:", err);
    }
  }

  // Get AI music recommendation
  try {
    storyResult.music = await recommendMusic({
      contentType: "story",
      topic: input.topic,
      platform: "instagram",
    });
  } catch (err) {
    console.error("[BrandManager] Music recommendation failed:", err);
  }

  // Enrich with SEO data
  return enrichWithSEO(storyResult, input.topic, input.topic, "instagram", "story");
}

// ── Thread Generator (Twitter/LinkedIn) ────────────────

export async function generateThread(input: {
  topic: string;
  platform?: "twitter" | "linkedin";
  tweets?: number;
  provider?: ProviderChoice;
}): Promise<{ tweets: string[]; hashtags: string[] }> {
  const platform = input.platform || "twitter";
  const numTweets = input.tweets || 5;
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Write a ${platform} thread about: ${input.topic}

NUMBER OF TWEETS: ${numTweets}
STYLE: ${platform === "twitter" ? "punchy, under 280 chars each, hook in first tweet" : "professional storytelling, 1-2 paragraphs per post"}

REQUIREMENTS:
- Tweet 1: Hook that makes people click "Show this thread"
- Tweets 2-${numTweets - 1}: One insight per tweet, build on previous
- Tweet ${numTweets}: Summary + CTA (follow, retweet, bookmark)
- Each tweet must stand alone but flow as a thread
- Use specific examples, numbers, stories

Return EXACTLY this JSON:
{
  "tweets": ["tweet 1", "tweet 2", "tweet 3"],
  "hashtags": ["relevant", "hashtags"]
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse thread content");
  const parsed = safeParseJson(jsonMatch[0]);

  return enrichWithSEO({
    tweets: parsed.tweets || [],
    hashtags: parsed.hashtags || [],
  }, input.topic, input.topic, input.platform || "twitter", "thread");
}

// ── Poll Generator ─────────────────────────────────────

export async function generatePoll(input: {
  topic: string;
  platform?: "twitter" | "linkedin" | "instagram";
  provider?: ProviderChoice;
}): Promise<{ question: string; options: string[]; caption: string }> {
  const platform = input.platform || "twitter";
  const provider = input.provider || "free";

  const result = await aiGenerate(
    `Create an engaging ${platform} poll about: ${input.topic}

REQUIREMENTS:
- Question must spark debate or curiosity
- 2-4 options that are relatable and fun
- Options should be balanced (not obvious winner)
- Caption to accompany the poll

Return EXACTLY this JSON:
{
  "question": "engaging poll question",
  "options": ["Option 1", "Option 2", "Option 3"],
  "caption": "caption to post with the poll"
}`,
    BRAND_VOICE,
    provider
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse poll content");
  const parsed = safeParseJson(jsonMatch[0]);

  return enrichWithSEO({
    question: parsed.question || "",
    options: parsed.options || [],
    caption: parsed.caption || "",
  }, input.topic, input.topic, platform, "poll");
}

// ── Weekly Content Plan ────────────────────────────────

export async function generateWeeklyPlan(input?: {
  platforms?: ContentPlatform[];
  content_types?: ContentType[];
  theme?: string;
}): Promise<ContentCalendarEntry[]> {
  const platforms = input?.platforms || ["instagram", "twitter"];
  const contentTypes = input?.content_types || ["carousel", "social_post", "reel_script", "thread"];
  const theme = input?.theme || "creator economy and live streaming tips";

  const result = await aiContent(
    `Create a 7-day content calendar for BarbieVerse.

PLATFORMS: ${platforms.join(", ")}
CONTENT TYPES: ${contentTypes.join(", ")}
WEEKLY THEME: ${theme}

RULES:
- 2-3 posts per day across platforms
- Mix content types (not all carousels or all posts)
- Best posting times for Indian audience (10am, 1pm, 7pm IST)
- Each post builds on the weekly theme
- Include trending topics when relevant

Return EXACTLY this JSON:
{
  "plan": [
    {
      "date": "2026-07-03",
      "platform": "instagram",
      "content_type": "carousel",
      "topic": "specific topic for this post"
    }
  ]
}`,
    { maxTokens: 4096 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse content plan");
  const parsed = safeParseJson(jsonMatch[0]);

  return (parsed.plan || []).map((entry: any) => ({
    date: entry.date || "",
    platform: entry.platform || "instagram",
    content_type: entry.content_type || "social_post",
    topic: entry.topic || "",
    status: "draft" as ContentStatus,
  }));
}

// ── Generate Image for Content ─────────────────────────

/**
 * Generate image for content — uses ComfyUI locally if available, falls back to Pollinations.
 * For photorealistic portraits, use generateContentImagePhotorealistic() instead.
 */
export async function generateContentImage(
  prompt: string,
  platform: ContentPlatform,
  type: ContentType,
): Promise<string> {
  let size: keyof typeof SIZES = "square";

  if (type === "story") size = "story";
  else if (type === "thumbnail") size = "thumbnail";
  else if (type === "carousel") size = "carousel";
  else if (platform === "twitter") size = "landscape";
  else if (platform === "linkedin") size = "landscape";
  else if (platform === "youtube") size = "thumbnail";

  // Always append brand aesthetic for consistent visual identity
  const enhancedPrompt = `${prompt}, ${BRAND_AESTHETIC}`;

  try {
    const result = await generateImageFull({
      prompt: enhancedPrompt,
      size,
      provider: "auto",
      useFaceDetailer: false,
    });
    return result.url;
  } catch {
    // Fallback to Pollinations
    const fallback = generateImageUrl({ prompt: enhancedPrompt, size, model: "flux" });
    return fallback.url;
  }
}

/**
 * Generate photorealistic portrait image — uses ComfyUI + FaceDetailer when available.
 * Best for: avatar images, creator photos, premium content.
 */
export async function generateContentImagePhotorealistic(
  prompt: string,
  size: keyof typeof SIZES = "portrait",
): Promise<string> {
  const enhancedPrompt = `photorealistic, high quality, detailed, professional photography, ${prompt}`;

  try {
    const result = await generateImageFull({
      prompt: enhancedPrompt,
      size,
      provider: "auto",
      useFaceDetailer: true,
    });
    return result.url;
  } catch {
    // Fallback to Pollinations
    const fallback = generateImageUrl({
      prompt: enhancedPrompt,
      size,
      model: "flux",
    });
    return fallback.url;
  }
}

/**
 * Get status of available image generation providers.
 */
export async function getImageGenStatus() {
  return getProviderStatus();
}
