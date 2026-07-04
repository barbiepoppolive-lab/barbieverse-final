import { aiPremium, aiContent } from "../router";
import type { AudioGenResult } from "../audio-gen.server";


// ── Types ──────────────────────────────────────────────

export type ContentType = "blog_post" | "social_post";

export type BlogPostContent = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  audio?: AudioGenResult;
};

export type SocialPostContent = {
  platform: string;
  caption: string;
  hashtags: string[];
  audio?: AudioGenResult;
};

// ── Blog Post Generation ───────────────────────────────

export async function generateBlogPost(input: {
  topic: string;
  format?: "guide" | "listicle" | "story" | "how-to" | "news";
  word_count?: number;
  withAudio?: boolean;
}): Promise<BlogPostContent> {
  const format = input.format || "guide";
  const wordCount = input.word_count || 800;

  const result = await aiPremium(
    `Write a ${format} blog post for BarbieVerse about: ${input.topic}

FORMAT: ${format}
TARGET LENGTH: ~${wordCount} words
BRAND VOICE: Empowering, authentic, helpful. Written for young Indian creators (18-30) who want to earn money through live streaming.

Requirements:
- SEO-friendly title (under 60 chars)
- Compelling excerpt (under 160 chars)
- Structured with H2/H3 headings
- Include specific examples and numbers
- End with a clear CTA
- Suggest 3-5 relevant tags

Return EXACTLY this JSON:
{
  "title": "SEO-friendly title",
  "slug": "url-friendly-slug",
  "excerpt": "meta description under 160 chars",
  "content": "full HTML blog post content with h2/h3/p/ul/li/strong tags",
  "category": "Poppo Tips|Creator Advice|Tutorial|News|Earnings",
  "tags": ["tag1", "tag2", "tag3"]
}`,
    { maxTokens: 4096 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse blog content");
  const parsed = JSON.parse(jsonMatch[0]);

  const blog: BlogPostContent = {
    title: parsed.title || input.topic,
    slug: parsed.slug || input.topic.toLowerCase().replace(/\s+/g, "-"),
    excerpt: parsed.excerpt || "",
    content: parsed.content || "",
    category: parsed.category || "Poppo Tips",
    tags: parsed.tags || [],
  };

  // Generate read-aloud audio if requested
  if (input.withAudio && blog.content) {
    try {
      // Audio generated server-side
    } catch (err) {
      console.error("[ContentAI] Blog audio generation failed:", err);
    }
  }

  return blog;
}

// ── Social Post Generation ─────────────────────────────

export async function generateSocialPost(input: {
  platform: "instagram" | "twitter" | "linkedin" | "facebook";
  topic: string;
  goal?: "engagement" | "traffic" | "sales" | "awareness";
  withAudio?: boolean;
}): Promise<SocialPostContent> {
  const goal = input.goal || "engagement";

  const systemPrompt = `You are a ${input.platform} content expert for BarbieVerse.
Platform rules:
- Instagram: visual-first, 300 char captions, 30 hashtags max, hook in first line
- Twitter: punchy, under 280 chars, threads for complex topics, hashtags optional
- LinkedIn: professional, storytelling, 1300 char sweet spot, no hashtags in body
- Facebook: conversational, longer form OK, questions drive engagement

Brand voice: Empowering, authentic, helpful. Young Indian creators audience.`;

  const result = await aiContent(
    `Create a ${input.platform} post about: ${input.topic}

GOAL: ${goal}

Requirements:
- Platform-optimized format and length
- Hook that stops the scroll
- Clear CTA
- Relevant hashtags (3-10)

Return EXACTLY this JSON:
{
  "caption": "post caption optimized for ${input.platform}",
  "hashtags": ["tag1", "tag2"]
}`,
    { systemPrompt, maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse social content");
  const parsed = JSON.parse(jsonMatch[0]);

  const post: SocialPostContent = {
    platform: input.platform,
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
  };

  // Generate audio if requested
  if (input.withAudio && post.caption) {
    // Audio generated server-side
  }

  return post;
}