// Content Repurposing Engine — Turn one piece of content into multiple formats
// Blog post → carousels + tweets + reel scripts

import { aiContent } from "./router";
import { generateSEO, generateHashtags, type Platform, type SEOData } from "./content-seo";

// ── Types ──────────────────────────────────────────────

export interface RepurposedContent {
  source: {
    type: string;
    title: string;
    content: string;
  };
  outputs: {
    type: string;
    platform: Platform;
    content: any;
    seo?: SEOData;
  }[];
}

// ── Content Repurposing ─────────────────────────────────

export async function repurposeContent(input: {
  content: string;
  title: string;
  source_type: string;
  target_platforms: Platform[];
  target_formats: string[];
  topic: string;
}): Promise<RepurposedContent> {
  const outputs: RepurposedContent["outputs"] = [];

  for (const format of input.target_formats) {
    for (const platform of input.target_platforms) {
      try {
        const content = await generateForFormat({
          content: input.content,
          title: input.title,
          source_type: input.source_type,
          target_format: format,
          platform,
          topic: input.topic,
        });

        // Generate SEO for each output
        const seo = await generateSEO({
          title: content.title || content.caption || content.headline || input.title,
          content: JSON.stringify(content),
          platform,
          content_type: format,
          topic: input.topic,
        });

        outputs.push({
          type: format,
          platform,
          content,
          seo,
        });
      } catch (err) {
        console.error(`[Repurpose] Failed to generate ${format} for ${platform}:`, err);
      }
    }
  }

  return {
    source: {
      type: input.source_type,
      title: input.title,
      content: input.content,
    },
    outputs,
  };
}

// ── Generate for Specific Format ────────────────────────

async function generateForFormat(input: {
  content: string;
  title: string;
  source_type: string;
  target_format: string;
  platform: Platform;
  topic: string;
}): Promise<any> {
  const prompts: Record<string, string> = {
    carousel: `Convert this ${input.source_type} into an Instagram carousel post:

SOURCE:
${input.content}

Create a 5-7 slide carousel with:
- Slide 1: Bold hook (stop the scroll)
- Slides 2-6: One key point per slide
- Slide 7: Strong CTA

Return JSON with: { title, slides[{headline, body, image_prompt}], caption, hashtags[] }`,

    reel: `Convert this ${input.source_type} into a 30-second Instagram reel script:

SOURCE:
${input.content}

Create a reel script with:
- Hook in first 3 seconds
- 3-5 scenes with visual/audio directions
- Text overlays for each scene
- Strong CTA at end

Return JSON with: { hook, scenes[{duration, visual, audio, text_overlay}], caption, hashtags[] }`,

    story: `Convert this ${input.source_type} into an Instagram story sequence (3 slides):

SOURCE:
${input.content}

Create 3 story slides:
- Slide 1: Hook/curiosity
- Slide 2: Value/tips
- Slide 3: CTA

Return JSON with: { slides[{text, image_prompt, cta}] }`,

    thread: `Convert this ${input.source_type} into a Twitter thread (5 tweets):

SOURCE:
${input.content}

Create a thread with:
- Tweet 1: Hook that makes people click "Show thread"
- Tweets 2-4: One insight per tweet
- Tweet 5: Summary + CTA

Return JSON with: { tweets[], hashtags[] }`,

    social_post: `Convert this ${input.source_type} into a ${input.platform} post:

SOURCE:
${input.content}

Create a ${input.platform}-optimized post with:
- Hook that stops the scroll
- Value in 3-5 sentences
- Clear CTA

Return JSON with: { caption, hashtags[] }`,

    blog_post: `Convert this ${input.source_type} into a blog post excerpt:

SOURCE:
${input.content}

Create a blog excerpt with:
- SEO-friendly title
- Compelling excerpt (160 chars)
- 300-500 word article body
- Tags

Return JSON with: { title, slug, excerpt, content, tags[] }`,
  };

  const prompt = prompts[input.target_format] || prompts.social_post;

  const result = await aiContent(prompt, { maxTokens: 2048 });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Failed to generate ${input.target_format}`);

  return JSON.parse(jsonMatch[0]);
}

// ── Quick Repurpose (Single Format) ────────────────────

export async function quickRepurpose(input: {
  content: string;
  title: string;
  source_type: string;
  target_format: string;
  platform: Platform;
  topic: string;
}): Promise<{ content: any; seo: SEOData }> {
  const content = await generateForFormat({
    content: input.content,
    title: input.title,
    source_type: input.source_type,
    target_format: input.target_format,
    platform: input.platform,
    topic: input.topic,
  });

  const seo = await generateSEO({
    title: content.title || content.caption || input.title,
    content: JSON.stringify(content),
    platform: input.platform,
    content_type: input.target_format,
    topic: input.topic,
  });

  return { content, seo };
}

// ── Content Templates ───────────────────────────────────

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  goal: "growth" | "engagement" | "sales" | "brand";
  content_types: string[];
  platforms: Platform[];
  topics: string[];
  style: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "growth-30-days",
    name: "30-Day Growth Sprint",
    description: "Series of educational carousels to grow followers",
    goal: "growth",
    content_types: ["carousel", "reel", "story"],
    platforms: ["instagram"],
    topics: [
      "How to start live streaming on Poppo Live",
      "5 tips to get your first 100 followers",
      "Best times to go live on Poppo",
      "How to engage your audience during streams",
      "Poppo Live vs Vone Live: Which is better?",
      "How to earn your first ₹1000 on Poppo",
      "Content ideas for live streamers",
    ],
    style: "educational",
  },
  {
    id: "engagement-polls",
    name: "Engagement Booster",
    description: "Polls, questions, and interactive content",
    goal: "engagement",
    content_types: ["poll", "story", "thread"],
    platforms: ["instagram", "twitter"],
    topics: [
      "What's your biggest challenge as a creator?",
      "Poppo or Vone: Which platform do you prefer?",
      "How much do you earn monthly from live streaming?",
      "What content type gets the most views?",
      "Morning stream or night stream?",
    ],
    style: "playful",
  },
  {
    id: "sales-testimonials",
    name: "Success Stories",
    description: "Creator testimonials and earnings showcases",
    goal: "sales",
    content_types: ["carousel", "reel", "social_post"],
    platforms: ["instagram", "linkedin"],
    topics: [
      "How I earned ₹50,000 in my first month on Poppo",
      "From zero to full-time creator in 90 days",
      "Real creator success stories",
      "Poppo Live earnings breakdown",
      "How hosts are earning big on Vone Live",
    ],
    style: "storytelling",
  },
  {
    id: "brand-authority",
    name: "Industry Authority",
    description: "Tips, insights, and thought leadership",
    goal: "brand",
    content_types: ["carousel", "thread", "blog_post"],
    platforms: ["instagram", "linkedin", "twitter"],
    topics: [
      "The future of live streaming in India",
      "Why creator economy is booming",
      "5 trends shaping social media in 2026",
      "How AI is changing content creation",
      "Building a personal brand as a creator",
    ],
    style: "educational",
  },
];

export function getTemplatesByGoal(goal: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.goal === goal);
}

export function getTemplateById(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(t => t.id === id);
}
