import { generateImage, type ImageGenInput, type ImageGenResult } from "../providers/fal-image";
import { aiPremium, aiContent } from "../router";

// ── Types ──────────────────────────────────────────────

export type ContentType = "carousel" | "blog_post" | "social_post" | "thumbnail" | "banner";

export type CarouselSlide = {
  id: number;
  title: string;
  description: string;
  image_prompt: string;
  image_url?: string;
  text_overlay?: string;
  bg_color?: string;
};

export type CarouselContent = {
  title: string;
  description: string;
  slides: CarouselSlide[];
  hashtags: string[];
  caption: string;
};

export type BlogPostContent = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  featured_image_prompt: string;
  featured_image_url?: string;
  tags: string[];
};

export type SocialPostContent = {
  platform: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
  image_url?: string;
  carousel?: CarouselSlide[];
};

export type ContentJob = {
  id: string;
  job_type: ContentType;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  status: "pending" | "generating_text" | "generating_images" | "completed" | "failed";
  total_cost_usd: number;
  error?: string;
  created_at: Date;
  completed_at?: Date;
};

// ── Carousel Generation ────────────────────────────────

export async function generateCarousel(input: {
  topic: string;
  slide_count?: number;
  style?: "educational" | "promotional" | "inspirational" | "storytelling";
  platform?: "instagram" | "linkedin" | "facebook";
  generate_images?: boolean;
}): Promise<CarouselContent & { images?: ImageGenResult[] }> {
  const slideCount = input.slide_count || 5;
  const style = input.style || "educational";
  const platform = input.platform || "instagram";

  const systemPrompt = `You are a world-class social media content creator specializing in ${style} carousels for ${platform}.
Your carousels are:
- Visually descriptive (each slide needs a clear image concept)
- Hook-driven (first slide stops the scroll)
- Value-packed (each slide teaches or inspires)
- CTA-driven (last slide drives action)

Write in the brand voice of BarbieVerse — empowering, authentic, fun.`;

  const result = await aiPremium(
    `Create a ${slideCount}-slide carousel about: ${input.topic}

STYLE: ${style}
PLATFORM: ${platform}

Requirements:
- First slide must be a scroll-stopping hook
- Each slide needs: title (6 words max), description (15 words max), image_prompt (detailed visual description for AI image generation)
- Last slide must be a clear CTA
- Include relevant hashtags
- Include a caption for the post

Return EXACTLY this JSON:
{
  "title": "carousel title",
  "description": "one line description",
  "slides": [
    {
      "id": 1,
      "title": "short title",
      "description": "short description",
      "image_prompt": "detailed image prompt for AI generation — describe style, colors, composition, mood",
      "text_overlay": "bold text on the slide",
      "bg_color": "#hex or gradient"
    }
  ],
  "hashtags": ["tag1", "tag2"],
  "caption": "post caption with emojis"
}`,
    { systemPrompt, maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse carousel content");
  const parsed = JSON.parse(jsonMatch[0]);

  const carousel: CarouselContent = {
    title: parsed.title || input.topic,
    description: parsed.description || "",
    slides: (parsed.slides || []).map((s: any, i: number) => ({
      id: s.id || i + 1,
      title: s.title || "",
      description: s.description || "",
      image_prompt: s.image_prompt || "",
      text_overlay: s.text_overlay,
      bg_color: s.bg_color,
    })),
    hashtags: parsed.hashtags || [],
    caption: parsed.caption || "",
  };

  // Generate images if requested
  let images: ImageGenResult[] | undefined;
  if (input.generate_images) {
    const imageInputs: ImageGenInput[] = carousel.slides.map((slide) => ({
      prompt: slide.image_prompt,
      model: "schnell",
      aspect_ratio: platform === "instagram" ? "1:1" : platform === "linkedin" ? "16:9" : "1:1",
    }));
    images = await Promise.all(imageInputs.map(generateImage));
    images.forEach((img, i) => {
      if (carousel.slides[i]) carousel.slides[i].image_url = img.imageUrl;
    });
  }

  return { ...carousel, images };
}

// ── Blog Post Generation ───────────────────────────────

export async function generateBlogPost(input: {
  topic: string;
  format?: "guide" | "listicle" | "story" | "how-to" | "news";
  word_count?: number;
  generate_image?: boolean;
}): Promise<BlogPostContent & { featured_image?: ImageGenResult }> {
  const format = input.format || "guide";
  const wordCount = input.word_count || 800;

  const result = await aiPremium(
    `Write a ${format} blog post for BarbieVerse about: ${input.topic}

FORMAT: ${format}
TARGET LENGTH: ~${wordCount} words
BRAND VOICE: Empowering, authentic, helpful. Written for young Indian creators (18-30) who want to earn through live streaming.

Requirements:
- SEO-friendly title (under 60 chars)
- Compelling excerpt (under 160 chars)
- Structured with H2/H3 headings
- Include specific examples and numbers
- End with a clear CTA
- Suggest relevant tags

Return EXACTLY this JSON:
{
  "title": "SEO-friendly title",
  "slug": "url-friendly-slug",
  "excerpt": "meta description under 160 chars",
  "content": "full HTML blog post content with h2/h3/p/ul/li/strong tags",
  "category": "Poppo Tips|Creator Advice|Tutorial|News|Earnings",
  "featured_image_prompt": "detailed image prompt for blog featured image — describe scene, lighting, style",
  "tags": ["tag1", "tag2", "tag3"]
}`,
    { maxTokens: 4096 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse blog content");
  const parsed = JSON.parse(jsonMatch[0]);

  const post: BlogPostContent = {
    title: parsed.title || input.topic,
    slug: parsed.slug || input.topic.toLowerCase().replace(/\s+/g, "-"),
    excerpt: parsed.excerpt || "",
    content: parsed.content || "",
    category: parsed.category || "Poppo Tips",
    featured_image_prompt: parsed.featured_image_prompt || "",
    tags: parsed.tags || [],
  };

  let featured_image: ImageGenResult | undefined;
  if (input.generate_image && post.featured_image_prompt) {
    featured_image = await generateImage({
      prompt: post.featured_image_prompt,
      model: "dev",
      aspect_ratio: "16:9",
    });
    post.featured_image_url = featured_image.imageUrl;
  }

  return { ...post, featured_image };
}

// ── Social Post Generation ─────────────────────────────

export async function generateSocialPost(input: {
  platform: "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";
  topic: string;
  goal?: "engagement" | "traffic" | "sales" | "awareness";
  generate_image?: boolean;
  include_carousel?: boolean;
}): Promise<SocialPostContent> {
  const goal = input.goal || "engagement";

  const systemPrompt = `You are a ${input.platform} content expert for BarbieVerse.
Platform rules:
- Instagram: visual-first, 300 char captions, 30 hashtags max, hook in first line
- Twitter: punchy, under 280 chars, threads for complex topics, hashtags optional
- LinkedIn: professional, storytelling, 1300 char sweet spot, no hashtags in body
- Facebook: conversational, longer form OK, questions drive engagement
- YouTube: SEO titles, description with timestamps, tags matter

Brand voice: Empowering, authentic, helpful. Young Indian creators audience.`;

  const result = await aiContent(
    `Create a ${input.platform} post about: ${input.topic}

GOAL: ${goal}
${input.include_carousel ? "Include a 5-slide carousel concept." : ""}

Requirements:
- Platform-optimized format and length
- Hook that stops the scroll
- Clear CTA
- Relevant hashtags
- If carousel: include slide-by-slide image prompts

Return EXACTLY this JSON:
{
  "caption": "post caption optimized for ${input.platform}",
  "hashtags": ["tag1", "tag2"],
  "image_prompt": "detailed image prompt for AI generation",
  ${input.include_carousel ? `"carousel": [
    {
      "id": 1,
      "title": "slide title",
      "description": "slide description",
      "image_prompt": "detailed visual prompt"
    }
  ],` : ""}
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
    image_prompt: parsed.image_prompt || "",
    carousel: parsed.carousel,
  };

  if (input.generate_image && post.image_prompt) {
    const image = await generateImage({
      prompt: post.image_prompt,
      model: "schnell",
      aspect_ratio: input.platform === "instagram" ? "1:1" : "16:9",
    });
    post.image_url = image.imageUrl;
  }

  return post;
}

// ── Thumbnail Generation ───────────────────────────────

export async function generateThumbnail(input: {
  title: string;
  style?: "bold" | "clean" | "cinematic" | "minimal";
  colors?: string[];
}): Promise<ImageGenResult> {
  const style = input.style || "bold";
  const colors = input.colors?.join(", ") || "pink, purple, neon";

  const stylePrompts: Record<string, string> = {
    bold: "Bold, eye-catching YouTube thumbnail with large text, vibrant colors, high contrast, dramatic lighting, professional quality",
    clean: "Clean, minimalist thumbnail with clear typography, soft colors, professional design, balanced composition",
    cinematic: "Cinematic thumbnail with dramatic lighting, depth of field, film-like color grading, epic feel",
    minimal: "Minimalist thumbnail with lots of whitespace, simple typography, elegant design",
  };

  return generateImage({
    prompt: `${stylePrompts[style]}. Title text: "${input.title}". Colors: ${colors}. 16:9 aspect ratio, YouTube thumbnail style.`,
    model: "dev",
    aspect_ratio: "16:9",
  });
}

// ── Banner Generation ──────────────────────────────────

export async function generateBanner(input: {
  text: string;
  purpose?: "blog_header" | "social_media" | "email" | "website";
  style?: "modern" | "bold" | "elegant" | "playful";
}): Promise<ImageGenResult> {
  const purpose = input.purpose || "blog_header";
  const style = input.style || "modern";

  const purposeSizes: Record<string, ImageGenInput["aspect_ratio"]> = {
    blog_header: "16:9",
    social_media: "1:1",
    email: "16:9",
    website: "16:9",
  };

  const stylePrompts: Record<string, string> = {
    modern: "Modern, sleek design with clean lines, gradient colors, professional look",
    bold: "Bold, impactful design with strong typography, vibrant colors, eye-catching",
    elegant: "Elegant, sophisticated design with serif fonts, muted colors, luxury feel",
    playful: "Fun, playful design with rounded shapes, bright colors, energetic feel",
  };

  return generateImage({
    prompt: `${stylePrompts[style]} banner with text: "${input.text}". Professional quality, high resolution.`,
    model: "dev",
    aspect_ratio: purposeSizes[purpose] || "16:9",
  });
}
