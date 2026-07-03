// AI Brand Manager — Virtual social media manager for BarbieVerse
// Generates ALL content types using FREE providers

import { aiContent, aiRoute } from "../router";
import { generateImageUrl, SIZES } from "../providers/pollinations";

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
}

export interface ReelScript {
  hook: string;
  scenes: { duration: string; visual: string; audio: string; text_overlay: string }[];
  caption: string;
  hashtags: string[];
  music_suggestion: string;
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

// ── Carousel Generator ─────────────────────────────────

export async function generateCarousel(input: {
  topic: string;
  slides?: number;
  style?: "educational" | "storytelling" | "listicle" | "tips";
}): Promise<{ title: string; slides: CarouselSlide[]; caption: string; hashtags: string[] }> {
  const numSlides = input.slides || 7;
  const style = input.style || "educational";

  const result = await aiContent(
    `Create an Instagram carousel post about: ${input.topic}

STYLE: ${style}
NUMBER OF SLIDES: ${numSlides}

REQUIREMENTS:
- Slide 1: Bold hook headline + short subtitle (this is the cover)
- Slides 2-${numSlides - 1}: One key point per slide with headline + 1-2 sentences
- Last slide: Strong CTA slide
- Each slide needs a visual description for image generation
- Keep text minimal — Instagram carousels work best with 30-50 words per slide
- Write in a conversational, empowering tone

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "slides": [
    {
      "headline": "short punchy headline",
      "body": "1-2 sentences max",
      "image_prompt": "detailed image description for AI image generation, photorealistic, vibrant colors"
    }
  ],
  "caption": "Instagram caption for this carousel",
  "hashtags": ["relevant", "hashtags"]
}`,
    { maxTokens: 4096 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse carousel content");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    title: parsed.title || input.topic,
    slides: parsed.slides || [],
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
  };
}

// ── Reel Script Generator ──────────────────────────────

export async function generateReelScript(input: {
  topic: string;
  duration?: "15s" | "30s" | "60s" | "90s";
  style?: "educational" | "entertaining" | "inspirational" | "behind-the-scenes";
}): Promise<ReelScript> {
  const duration = input.duration || "30s";
  const style = input.style || "educational";

  const result = await aiContent(
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
  "music_suggestion": "trending audio style"
}`,
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse reel script");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    hook: parsed.hook || "",
    scenes: parsed.scenes || [],
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
    music_suggestion: parsed.music_suggestion || "",
  };
}

// ── Thumbnail Generator ────────────────────────────────

export async function generateThumbnail(input: {
  title: string;
  style?: "bold" | "clean" | "dramatic" | "playful";
}): Promise<{ image_url: string; image_prompt: string }> {
  const style = input.style || "bold";

  const result = await aiContent(
    `Create an image prompt for a YouTube/blog thumbnail about: ${input.title}

STYLE: ${style}
REQUIREMENTS:
- Eye-catching and clickable
- Bold text-friendly composition (space for text overlay)
- Vibrant colors
- Professional quality
- 16:9 aspect ratio

Return EXACTLY this JSON:
{
  "image_prompt": "detailed image generation prompt, photorealistic, vibrant"
}`,
    { maxTokens: 512 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse thumbnail prompt");
  const parsed = JSON.parse(jsonMatch[0]);

  const imageResult = generateImageUrl({
    prompt: parsed.image_prompt || input.title,
    size: "thumbnail",
    model: "flux",
  });

  return {
    image_url: imageResult.url,
    image_prompt: parsed.image_prompt || "",
  };
}

// ── Story Generator ────────────────────────────────────

export async function generateStory(input: {
  topic: string;
  slides?: number;
}): Promise<{ slides: { text: string; image_prompt: string; cta?: string }[] }> {
  const numSlides = input.slides || 3;

  const result = await aiContent(
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

Return EXACTLY this JSON:
{
  "slides": [
    {
      "text": "short text on slide",
      "image_prompt": "background image prompt for AI generation",
      "cta": "optional call to action"
    }
  ]
}`,
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse story content");
  const parsed = JSON.parse(jsonMatch[0]);

  return { slides: parsed.slides || [] };
}

// ── Thread Generator (Twitter/LinkedIn) ────────────────

export async function generateThread(input: {
  topic: string;
  platform?: "twitter" | "linkedin";
  tweets?: number;
}): Promise<{ tweets: string[]; hashtags: string[] }> {
  const platform = input.platform || "twitter";
  const numTweets = input.tweets || 5;

  const result = await aiContent(
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
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse thread content");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    tweets: parsed.tweets || [],
    hashtags: parsed.hashtags || [],
  };
}

// ── Poll Generator ─────────────────────────────────────

export async function generatePoll(input: {
  topic: string;
  platform?: "twitter" | "linkedin" | "instagram";
}): Promise<{ question: string; options: string[]; caption: string }> {
  const platform = input.platform || "twitter";

  const result = await aiContent(
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
    { maxTokens: 1024 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse poll content");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    question: parsed.question || "",
    options: parsed.options || [],
    caption: parsed.caption || "",
  };
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
  const parsed = JSON.parse(jsonMatch[0]);

  return (parsed.plan || []).map((entry: any) => ({
    date: entry.date || "",
    platform: entry.platform || "instagram",
    content_type: entry.content_type || "social_post",
    topic: entry.topic || "",
    status: "draft" as ContentStatus,
  }));
}

// ── Generate Image for Content ─────────────────────────

export function generateContentImage(
  prompt: string,
  platform: ContentPlatform,
  type: ContentType,
): string {
  let size: keyof typeof SIZES = "square";

  if (type === "story") size = "story";
  else if (type === "thumbnail") size = "thumbnail";
  else if (type === "carousel") size = "carousel";
  else if (platform === "twitter") size = "landscape";
  else if (platform === "linkedin") size = "landscape";
  else if (platform === "youtube") size = "thumbnail";

  const result = generateImageUrl({ prompt, size, model: "flux" });
  return result.url;
}
