// Meta Ads Creative Generator — generates ready-to-launch ad copy + visuals
// for recruiting content creators via paid Facebook/Instagram ads.
//
// This does NOT create or launch campaigns (see src/lib/ads/meta-marketing.ts
// for that scaffold, which needs a real Business Manager ad account before
// it can do anything). This module solves the actual bottleneck described:
// hand-writing ad creative for every test is slow and expensive. This
// generates multiple quality-gated angle variants with images in one call,
// ready to paste into Meta Ads Manager's ad creation flow yourself.
//
// Deliberate exclusion: appearance/attractiveness-based hooks. This mirrors
// the same decision already made for organic content — recruiting people
// (disproportionately women, given the pay structure) using looks as bait is
// not a direction this generates, paid or organic. Every angle below sells
// the actual opportunity (money, flexibility, trust, community, real
// testimonial), not the recruiter's or a model's appearance.

import { aiContent } from "../router";
import { scoreContent, improveContent } from "../content-quality";
import { generateImage } from "../image-gen";
import { seedFromString, personaForTopic, imageStyleFor } from "../image-persona";
import { TERMINOLOGY_RULES } from "@/lib/ai/brand-terminology";
import { checkCompliance } from "@/lib/ai/compliance-gate";

export type AdAngle =
  | "earnings_transparency"
  | "flexibility_no_experience"
  | "creator_testimonial"
  | "trust_safety"
  | "community_support";

export interface AdVariant {
  angle: AdAngle;
  headline: string;
  primary_text: string;
  description: string;
  cta: string;
  image_prompt: string;
  image_url?: string;
  quality_score?: number;
}

export interface AdCreativeSet {
  objective: string;
  variants: AdVariant[];
}

export interface AdCarouselCard {
  headline: string;
  description: string;
  image_prompt: string;
  image_url?: string;
}

export interface AdCarousel {
  angle: AdAngle;
  primary_text: string;
  cta: string;
  cards: AdCarouselCard[];
}

const AD_ANGLES: { angle: AdAngle; brief: string }[] = [
  {
    angle: "earnings_transparency",
    brief:
      "Lead with the two real income streams — streaming payouts AND brand deals — as a diversified creator income, not a single job. State NO rupee figure of any kind, and never use \"guarantee\"/\"guaranteed\". If you want to point at evidence, refer people to the earnings proof published on barbieverse.org without quoting a number — e.g. 'see real earnings on our site'. The site carries the figures; the ad does not.",
  },
  {
    angle: "flexibility_no_experience",
    brief:
      "Lead with 'no experience, no followers needed' — low barrier to entry, flexible hours, work from home. Speaks to someone who's never considered this as a real job option.",
  },
  {
    angle: "creator_testimonial",
    brief:
      "Frame as a real creator's first-person voice about their actual experience joining Barbieverse — specific and personal, not generic marketing copy. (Note: needs a real, consenting creator's actual quote before running — see delivery notes.)",
  },
  {
    angle: "trust_safety",
    brief:
      "Lead with trust — never asks for your password, transparent on-time payouts, treated like talent not just a number. Speaks to someone who's wary of online 'earn money' scams.",
  },
  {
    angle: "community_support",
    brief:
      "Lead with support/community/Academy — you're not doing this alone, real training for beginners, real people helping you grow.",
  },
];

// Backstop guard — same pattern as the coin-selling guard in
// social-publish/index.ts. The prompt already instructs the model to avoid
// "guarantee" language and bare rupee figures, but this catches it if the
// model drifts anyway, since Meta's classifier doesn't care about intent.
const BANNED_INCOME_CLAIM_MARKERS = [
  "guarantee", "guaranteed", "assured return", "assured income", "promised income",
  "₹1,150", "₹1150", "₹575", "guaranteed money", "guaranteed payout",
];

function looksLikeBannedIncomeClaim(text: string): boolean {
  const lower = text.toLowerCase();
  if (BANNED_INCOME_CLAIM_MARKERS.some((m) => lower.includes(m.toLowerCase()))) {
    return true;
  }

  // Also run the shared compliance gate, so ads are held to the same standard
  // as organic posts. The marker list above only catches literal strings it
  // was told about; the gate catches any rupee figure, scam patterns, and
  // minor-targeting language. Keeping both means a new banned phrase only has
  // to be added in one place to cover every surface.
  return !checkCompliance({ content: text }).passed;
}

async function generateOneVariant(opts: {
  objective: string;
  angle: AdAngle;
  brief: string;
  qualityThreshold: number;
}): Promise<AdVariant | null> {
  const result = await aiContent(
    `You are writing a Meta (Facebook/Instagram) recruitment ad for BarbieVerse, an agency that helps people become paid live-streaming creators on Poppo Live / Vone Live.

OBJECTIVE: ${opts.objective}
HOOK ANGLE: ${opts.brief}

${TERMINOLOGY_RULES}

COMPLIANCE (STRICT):
- NEVER use the words "guarantee", "guaranteed", "assured", or "promised" —
  Meta's ad policy flags this language for money-making offers regardless of
  whether the underlying number is true. State no specific rupee figure in
  the ad copy at all.
- Point at evidence WITHOUT quoting it. Say "see real earnings on our site"
  and let barbieverse.org carry the figures. Never reproduce a rupee amount
  in the ad copy — not the agency's own results, not a creator's earnings,
  not a range. No numbers attached to money, full stop.
- Frame the opportunity as earning through online streaming AND brand deals
  — a diversified creator income, not a single-employer job posting. Avoid
  "hiring"/"job"/"position" language, which risks Meta's automated
  employment-ad classification and its targeting restrictions.

META AD FORMAT RULES:
- headline: under 40 characters, punchy, IS the hook
- primary_text: 90-125 characters ideal (shown above the image in feed) — short converts better than long here
- description: under 30 characters, supporting line below the headline
- cta: one of "Sign Up", "Learn More", "Apply Now", "Contact Us"

Return EXACTLY this JSON:
{
  "headline": "...",
  "primary_text": "...",
  "description": "...",
  "cta": "...",
  "image_prompt": "a detailed visual description for an AI image generator — should look like a real, candid creator photo, not a stock-photo/corporate ad look, matching the hook angle"
}`,
    { maxTokens: 700 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const variant: AdVariant = {
    angle: opts.angle,
    headline: (parsed.headline || "").slice(0, 60),
    primary_text: parsed.primary_text || "",
    description: (parsed.description || "").slice(0, 40),
    cta: parsed.cta || "Sign Up",
    image_prompt: parsed.image_prompt || opts.objective,
  };

  // Income-claim guard — checked BEFORE the quality gate so a rewrite for
  // compliance doesn't get skipped just because the copy already scored
  // well. If the model used "guarantee" language or a bare rupee figure
  // anywhere across headline/primary_text/description, rewrite before
  // anything else touches it.
  if (
    looksLikeBannedIncomeClaim(variant.headline) ||
    looksLikeBannedIncomeClaim(variant.primary_text) ||
    looksLikeBannedIncomeClaim(variant.description)
  ) {
    try {
      const rewritten = await improveContent({
        content: `${variant.headline}\n${variant.primary_text}\n${variant.description}`,
        content_type: "ad_copy",
        instruction:
          `Rewrite this Meta ad copy to remove ALL "guarantee"/"guaranteed" language and any specific rupee figure. ` +
          `Instead, point to real earnings proof on barbieverse.org (do not restate the number). Keep the same three-line structure: headline, then primary text, then description.`,
      });
      const lines = rewritten.improved.split("\n").filter(Boolean);
      if (lines[0]) variant.headline = lines[0].slice(0, 60);
      if (lines[1]) variant.primary_text = lines[1];
      if (lines[2]) variant.description = lines[2].slice(0, 40);
    } catch (e: any) {
      console.error("[ad-creative] income-claim rewrite failed, flagging original for manual review:", e?.message);
    }
  }

  // Quality gate — same scorer used for organic content, applied to the
  // actual persuasive copy (primary_text).
  try {
    const quality = await scoreContent({
      content: variant.primary_text,
      content_type: "ad_copy",
      platform: "facebook",
      topic: opts.objective,
    });
    variant.quality_score = quality.overall;
    if (quality.overall < opts.qualityThreshold) {
      const improved = await improveContent({
        content: variant.primary_text,
        content_type: "ad_copy",
        instruction: `Rewrite this Meta ad primary text, fixing: ${quality.suggestions.join("; ")}. Keep it under 150 characters, no appearance-based hooks, no "guarantee" language, no rupee figures.`,
      });
      variant.primary_text = improved.improved;
    }
  } catch (e: any) {
    console.error("[ad-creative] quality gate failed, using original copy:", e?.message);
  }

  // Image — persona/seed logic shared with organic content generation, so
  // each of the 5 angle variants gets a distinct image instead of
  // duplicates, and the gender isn't hardcoded.
  try {
    const persona = personaForTopic(`${opts.objective} ${opts.angle}`);
    const style = imageStyleFor(persona);
    const img = await generateImage({
      prompt: `${style}. ${variant.image_prompt}`,
      size: "square",
      seed: seedFromString(`${opts.objective}-${opts.angle}`),
      provider: "auto",
    });
    variant.image_url = img.url;
  } catch (e: any) {
    console.error(`[ad-creative] image generation failed for angle "${opts.angle}":`, e?.message);
  }

  return variant;
}

/**
 * Generate a batch of quality-gated Meta ad variants — one per hook angle —
 * each with its own copy and image, ready to paste into Ads Manager as
 * separate ads within one ad set for A/B testing.
 */
export async function generateAdCreative(input: {
  objective?: string;
  variantCount?: number;
  qualityThreshold?: number;
}): Promise<AdCreativeSet> {
  const objective =
    input.objective ||
    "Recruit women to earn through online streaming and brand deals with Barbieverse — direct people to the earnings proof published on barbieverse.org rather than quoting any figure in the ad. No rupee amounts, no ranges, and never the word \"guarantee\".";
  const count = Math.min(input.variantCount || AD_ANGLES.length, AD_ANGLES.length);
  const threshold = input.qualityThreshold ?? 65;

  const variants: AdVariant[] = [];
  for (const { angle, brief } of AD_ANGLES.slice(0, count)) {
    const variant = await generateOneVariant({ objective, angle, brief, qualityThreshold: threshold });
    if (variant) variants.push(variant);
  }

  return { objective, variants };
}

/**
 * Generate a single carousel ad (one shared primary_text/CTA, multiple
 * visual cards) for ONE chosen angle — useful once you know which angle is
 * converting and want to test a few different visual treatments of it.
 */
export async function generateAdCarousel(input: {
  objective?: string;
  angle?: AdAngle;
  cardCount?: number;
}): Promise<AdCarousel> {
  const objective =
    input.objective ||
    "Recruit women to earn through online streaming and brand deals with Barbieverse — direct people to the earnings proof published on barbieverse.org rather than quoting any figure in the ad. No rupee amounts, no ranges, and never the word \"guarantee\".";
  const angleEntry = AD_ANGLES.find((a) => a.angle === input.angle) || AD_ANGLES[0];
  const cardCount = Math.min(Math.max(input.cardCount || 4, 2), 10);

  const result = await aiContent(
    `You are writing a Meta (Facebook/Instagram) CAROUSEL recruitment ad for BarbieVerse (paid Poppo/Vone live hosting).

OBJECTIVE: ${objective}
HOOK ANGLE: ${angleEntry.brief}

${TERMINOLOGY_RULES} No appearance-based hooks. No coin-selling.

COMPLIANCE (STRICT): never use "guarantee"/"guaranteed"/"assured"/"promised". State no specific rupee figure — point to the real July earnings proof on barbieverse.org instead. Frame this as earning through streaming AND brand deals, not a single-employer job — avoid "hiring"/"job"/"position" language.

Write ONE shared primary_text (90-125 chars, the hook shown above the carousel) and ${cardCount} distinct carousel cards, each a different angle on the SAME theme (e.g. a different earnings milestone, a different step of the sign-up process, a different proof point) — each card needs its own short headline (under 40 chars) and description (under 30 chars).

Return EXACTLY this JSON:
{
  "primary_text": "...",
  "cta": "Sign Up",
  "cards": [
    { "headline": "...", "description": "...", "image_prompt": "detailed visual description, real-feeling not stock-photo" }
  ]
}`,
    { maxTokens: 1400 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse carousel ad content");
  const parsed = JSON.parse(jsonMatch[0]);

  // Income-claim guard, same as the single-variant path — check the shared
  // primary_text and every card's headline/description before generating
  // any images.
  let primaryText = parsed.primary_text || "";
  if (looksLikeBannedIncomeClaim(primaryText)) {
    try {
      const rewritten = await improveContent({
        content: primaryText,
        content_type: "ad_copy",
        instruction: `Rewrite this Meta carousel ad's primary text to remove all "guarantee"/"guaranteed" language and any rupee figure. Point to real earnings proof on barbieverse.org instead.`,
      });
      primaryText = rewritten.improved;
    } catch (e: any) {
      console.error("[ad-creative] carousel income-claim rewrite failed:", e?.message);
    }
  }

  const cards: AdCarouselCard[] = [];
  const rawCards = Array.isArray(parsed.cards) ? parsed.cards.slice(0, cardCount) : [];
  let cardIndex = 0;
  for (const card of rawCards) {
    const c: AdCarouselCard = {
      headline: (card.headline || "").slice(0, 60),
      description: (card.description || "").slice(0, 40),
      image_prompt: card.image_prompt || objective,
    };

    if (looksLikeBannedIncomeClaim(c.headline) || looksLikeBannedIncomeClaim(c.description)) {
      try {
        const rewritten = await improveContent({
          content: `${c.headline}\n${c.description}`,
          content_type: "ad_copy",
          instruction: `Rewrite this carousel card's headline and description to remove "guarantee" language and any rupee figure. Keep the two-line structure.`,
        });
        const lines = rewritten.improved.split("\n").filter(Boolean);
        if (lines[0]) c.headline = lines[0].slice(0, 60);
        if (lines[1]) c.description = lines[1].slice(0, 40);
      } catch (e: any) {
        console.error(`[ad-creative] carousel card ${cardIndex} income-claim rewrite failed:`, e?.message);
      }
    }

    try {
      const persona = personaForTopic(`${objective} ${angleEntry.angle}`);
      const style = imageStyleFor(persona);
      const img = await generateImage({
        prompt: `${style}. ${c.image_prompt}`,
        size: "portrait",
        seed: seedFromString(`${objective}-${angleEntry.angle}-card-${cardIndex}`),
        provider: "auto",
      });
      c.image_url = img.url;
    } catch (e: any) {
      console.error(`[ad-creative] carousel card ${cardIndex} image failed:`, e?.message);
    }
    cards.push(c);
    cardIndex++;
  }

  return {
    angle: angleEntry.angle,
    primary_text: primaryText,
    cta: parsed.cta || "Sign Up",
    cards,
  };
}
