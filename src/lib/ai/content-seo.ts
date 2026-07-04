// Content SEO & Hashtag Engine — Auto-generate SEO metadata + optimized hashtags
// for every piece of content across all platforms

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export type Platform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube" | "tiktok";

export interface SEOData {
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image_prompt: string;
  slug: string;
  keywords: string[];
  canonical_url?: string;
  schema_type: "Article" | "SocialMediaPosting" | "BlogPosting";
  schema_org: Record<string, any>;
}

export interface HashtagSet {
  branded: string[];
  niche: string[];
  trending: string[];
  popular: string[];
  total_count: number;
  platform_limit: number;
  fits_platform: boolean;
}

export interface ContentSEO {
  seo: SEOData;
  hashtags: HashtagSet;
  quality_score: number;
  quality_notes: string[];
}

// ── Platform Hashtag Limits ─────────────────────────────

const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 30,
  twitter: 3,
  linkedin: 5,
  facebook: 3,
  youtube: 15,
  tiktok: 5,
};

// ── Branded Hashtags ────────────────────────────────────

const BRANDED_HASHTAGS = [
  "#BarbieVerse",
  "#PoppoLive",
  "#VoneLive",
  "#CreatorEconomy",
  "#LiveStreaming",
  "#IndianCreators",
  "#EarnMoney",
  "#PoppoHost",
];

// ── SEO Generator ──────────────────────────────────────

export async function generateSEO(input: {
  title: string;
  content: string;
  platform: Platform;
  content_type: string;
  topic: string;
}): Promise<SEOData> {
  const result = await aiContent(
    `Generate SEO metadata for this ${input.content_type} about: ${input.topic}

PLATFORM: ${input.platform}
TITLE: ${input.title}
CONTENT PREVIEW: ${input.content.slice(0, 500)}

Generate optimized SEO metadata. Return EXACTLY this JSON:
{
  "meta_title": "SEO title under 60 chars, include primary keyword",
  "meta_description": "Meta description under 160 chars, compelling with CTA",
  "og_title": "Open Graph title, can be slightly different from meta_title",
  "og_description": "Open Graph description, engaging preview",
  "og_image_prompt": "Detailed prompt for AI to generate OG image (1200x630)",
  "slug": "url-friendly-slug-with-primary-keyword",
  "keywords": ["primary keyword", "secondary keyword", "long tail keyword", "related term", "semantic keyword"],
  "schema_type": "Article|SocialMediaPosting|BlogPosting"
}

RULES:
- meta_title MUST be under 60 characters
- meta_description MUST be under 160 characters
- Include primary keyword in first 3 words
- Use power words: Ultimate, Guide, Tips, Secrets, Proven
- For Indian audience: include location-specific keywords when relevant
- Slug should be short, descriptive, include main keyword`,
    { maxTokens: 512 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse SEO data");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    meta_title: (parsed.meta_title || input.title).slice(0, 60),
    meta_description: (parsed.meta_description || "").slice(0, 160),
    og_title: parsed.og_title || parsed.meta_title || input.title,
    og_description: parsed.og_description || parsed.meta_description || "",
    og_image_prompt: parsed.og_image_prompt || "",
    slug: parsed.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    keywords: parsed.keywords || [],
    schema_type: parsed.schema_type || "Article",
    schema_org: {
      "@context": "https://schema.org",
      "@type": parsed.schema_type || "Article",
      "headline": input.title,
      "description": parsed.meta_description,
      "author": { "@type": "Organization", "name": "BarbieVerse" },
      "publisher": { "@type": "Organization", "name": "BarbieVerse" },
    },
  };
}

// ── Hashtag Generator ───────────────────────────────────

export async function generateHashtags(input: {
  topic: string;
  platform: Platform;
  content_type: string;
  niche?: string;
}): Promise<HashtagSet> {
  const limit = PLATFORM_LIMITS[input.platform];

  const result = await aiContent(
    `Generate optimized hashtags for ${input.platform} about: ${input.topic}

CONTENT TYPE: ${input.content_type}
PLATFORM: ${input.platform}
MAX HASHTAGS: ${limit}
NICHE: ${input.niche || "creator economy, live streaming, Indian creators"}

Generate hashtags in these categories. Return EXACTLY this JSON:
{
  "niche": ["3-5 niche-specific hashtags (low competition, high relevance)"],
  "trending": ["3-5 currently trending hashtags in this space"],
  "popular": ["3-5 popular hashtags with high reach"]
}

RULES:
- Instagram: mix small (10K-100K), medium (100K-500K), and large (500K+) hashtags
- Twitter: max 3 hashtags, only the most relevant
- LinkedIn: professional hashtags, max 5
- All hashtags must be relevant to the content topic
- Include Indian-specific hashtags when relevant (#IndianCreator, #IndiaStreaming)
- No banned or spammy hashtags
- Lowercase, no spaces
- Include variations (singular/plural, abbreviations)`,
    { maxTokens: 512 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  let niche = ["#CreatorEconomy", "#LiveStreaming", "#BarbieVerse"];
  let trending = ["#PoppoLive", "#IndianCreators", "#EarnOnline"];
  let popular = ["#ContentCreator", "#SocialMediaTips", "#DigitalCreator"];

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      niche = parsed.niche || niche;
      trending = parsed.trending || trending;
      popular = parsed.popular || popular;
    } catch {}
  }

  // Ensure all start with #
  const ensureHash = (tags: string[]) => tags.map(t => t.startsWith("#") ? t : `#${t}`);

  const allNiche = ensureHash(niche);
  const allTrending = ensureHash(trending);
  const allPopular = ensureHash(popular);
  const branded = BRANDED_HASHTAGS.slice(0, Math.min(3, limit));

  // Combine and trim to platform limit
  const allTags = [...branded, ...allNiche, ...allTrending, ...allPopular];
  const trimmed = allTags.slice(0, limit);

  return {
    branded,
    niche: allNiche,
    trending: allTrending,
    popular: allPopular,
    total_count: trimmed.length,
    platform_limit: limit,
    fits_platform: trimmed.length <= limit,
  };
}

// ── Combined Content SEO ────────────────────────────────

export async function generateContentSEO(input: {
  title: string;
  content: string;
  topic: string;
  platform: Platform;
  content_type: string;
}): Promise<ContentSEO> {
  const [seo, hashtags] = await Promise.all([
    generateSEO(input),
    generateHashtags(input),
  ]);

  // Basic quality scoring
  let quality_score = 70;
  const quality_notes: string[] = [];

  // SEO scoring
  if (seo.meta_title.length <= 60) { quality_score += 5; } else { quality_notes.push("Meta title too long (>60 chars)"); }
  if (seo.meta_description.length <= 160) { quality_score += 5; } else { quality_notes.push("Meta description too long (>160 chars)"); }
  if (seo.keywords.length >= 3) { quality_score += 5; } else { quality_notes.push("Add more keywords (need 3+)"); }
  if (seo.slug.length > 0) { quality_score += 5; } else { quality_notes.push("Add a URL slug"); }

  // Hashtag scoring
  if (hashtags.fits_platform) { quality_score += 5; } else { quality_notes.push(`Too many hashtags for ${input.platform} (max ${hashtags.platform_limit})`); }
  if (hashtags.branded.length > 0) { quality_score += 3; }
  if (hashtags.niche.length >= 3) { quality_score += 2; }

  return {
    seo,
    hashtags,
    quality_score: Math.min(100, quality_score),
    quality_notes,
  };
}

// ── Helper: Format Hashtags for Platform ────────────────

export function formatHashtags(hashtags: HashtagSet, platform: Platform): string {
  const all = [...new Set([...hashtags.branded, ...hashtags.niche, ...hashtags.trending, ...hashtags.popular])];
  const trimmed = all.slice(0, PLATFORM_LIMITS[platform]);

  switch (platform) {
    case "twitter":
      return trimmed.slice(0, 3).join(" ");
    case "linkedin":
      return trimmed.slice(0, 5).join(", ");
    case "instagram":
    default:
      return trimmed.join(" ");
  }
}

// ── Helper: Get Best Posting Times ──────────────────────

export function getBestPostingTimes(platform: Platform): { time: string; label: string }[] {
  const times: Record<Platform, { time: string; label: string }[]> = {
    instagram: [
      { time: "10:00", label: "Morning (10 AM IST)" },
      { time: "13:00", label: "Lunch (1 PM IST)" },
      { time: "19:00", label: "Evening (7 PM IST)" },
      { time: "21:00", label: "Night (9 PM IST)" },
    ],
    twitter: [
      { time: "08:00", label: "Early Bird (8 AM IST)" },
      { time: "12:00", label: "Lunch Break (12 PM IST)" },
      { time: "17:00", label: "Commute (5 PM IST)" },
    ],
    linkedin: [
      { time: "07:30", label: "Pre-work (7:30 AM IST)" },
      { time: "12:00", label: "Lunch (12 PM IST)" },
      { time: "17:30", label: "Post-work (5:30 PM IST)" },
    ],
    facebook: [
      { time: "09:00", label: "Morning (9 AM IST)" },
      { time: "13:00", label: "Lunch (1 PM IST)" },
      { time: "20:00", label: "Evening (8 PM IST)" },
    ],
    youtube: [
      { time: "14:00", label: "Afternoon (2 PM IST)" },
      { time: "18:00", label: "Evening (6 PM IST)" },
      { time: "21:00", label: "Night (9 PM IST)" },
    ],
    tiktok: [
      { time: "07:00", label: "Early Morning (7 AM IST)" },
      { time: "12:00", label: "Lunch (12 PM IST)" },
      { time: "19:00", label: "Evening (7 PM IST)" },
    ],
  };

  return times[platform] || times.instagram;
}
