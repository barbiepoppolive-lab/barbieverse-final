// Supervisor Agent — single guarantee layer on top of the content pipeline.
// Enforces viral-quality + brand + Moj/regional fit before content is "publish-ready".
// Nothing is approved unless it scores >= threshold; below threshold => auto-revise.

import { aiContent } from "./router";
import { generateCarousel } from "./modules/brand-manager";

export interface SupervisorReview {
  score: number; // 0-100
  dimensions: {
    hook_effectiveness: number;
    retention_potential: number;
    cta_presence: number;
    brand_consistency: number;
    moj_fit: number;
  };
  reasons: string[];
}

export interface SupervisorResult {
  approved: boolean;
  quality_score: number;
  reasons: string[];
  revisions: number;
  content: any;
  platform: string;
}

const REVIEW_SYSTEM = `You are the BarbieVerse Quality Supervisor. You review Moj (Indian short-video app) recruitment content meant to drive streamers to Poppo Live / Vone Live.

Score the content on 5 dimensions (each 0-100):
1. hook_effectiveness — does slide 1 / caption stop the scroll? (curiosity, bold number, shock)
2. retention_potential — does each slide keep attention? (story arc, pacing, music-sync feel)
3. cta_presence — is there a clear Poppo/Vone referral CTA on the last slide + caption?
4. brand_consistency — empowering, fun, authentic, Hinglish, pink/gold world
5. moj_fit — Hindi/regional language, local references, vertical 9:16, trend-aware

Return EXACTLY this JSON:
{
  "score": <overall 0-100>,
  "dimensions": { "hook_effectiveness": 0, "retention_potential": 0, "cta_presence": 0, "brand_consistency": 0, "moj_fit": 0 },
  "reasons": ["one line per weak dimension, or 'strong' if all good"]
}`;

async function reviewContent(content: any, topic: string): Promise<SupervisorReview> {
  const artifact = JSON.stringify({
    title: content.title,
    slides: content.slides?.map((s: any) => ({ headline: s.headline, body: s.body })),
    caption: content.caption,
    hashtags: content.hashtags,
  });

  const res = await aiContent(
    `Review this Moj carousel for BarbieVerse. Topic: ${topic}\n\nCONTENT:\n${artifact}`,
    { systemPrompt: REVIEW_SYSTEM, maxTokens: 800 }
  );

  const m = res.text.match(/\{[\s\S]*\}/);
  if (!m) {
    return {
      score: 50,
      dimensions: { hook_effectiveness: 50, retention_potential: 50, cta_presence: 50, brand_consistency: 50, moj_fit: 50 },
      reasons: ["Review parse failed"],
    };
  }

  // safe parse
  let clean = m[0].replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = (() => { try { return JSON.parse(clean); } catch { try { return JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)); } catch { return null; } } })();
  if (!parsed) return { score: 50, dimensions: { hook_effectiveness: 50, retention_potential: 50, cta_presence: 50, brand_consistency: 50, moj_fit: 50 }, reasons: ["Review parse failed"] };

  return {
    score: parsed.score ?? 50,
    dimensions: parsed.dimensions ?? { hook_effectiveness: 50, retention_potential: 50, cta_presence: 50, brand_consistency: 50, moj_fit: 50 },
    reasons: parsed.reasons ?? [],
  };
}

/**
 * Generate a Moj carousel through the Supervisor guarantee.
 * Hard gate: score >= 70 => approved. Else auto-revise up to `maxRevisions` passes.
 */
export async function generateMojCarouselSupervised(
  topic: string,
  opts?: { slides?: number; maxRevisions?: number; threshold?: number }
): Promise<SupervisorResult> {
  const threshold = opts?.threshold ?? 70;
  const maxRevisions = opts?.maxRevisions ?? 3;

  let revisions = 0;
  let content = await generateCarousel({
    topic,
    platform: "moj",
    slides: opts?.slides ?? 7,
    style: "educational",
    provider: "free",
  });

  let review = await reviewContent(content, topic);

  while (review.score < threshold && revisions < maxRevisions) {
    console.log(`[Supervisor] Score ${review.score} < ${threshold}. Revising (${revisions + 1}/${maxRevisions})...`);
    revisions++;
    // Regenerate with the weakest dimensions as guidance
    content = await generateCarousel({
      topic: `${topic} — improve: ${review.reasons.join("; ")}`,
      platform: "moj",
      slides: opts?.slides ?? 7,
      style: "educational",
      provider: "free",
    });
    review = await reviewContent(content, topic);
  }

  return {
    approved: review.score >= threshold,
    quality_score: review.score,
    reasons: review.reasons,
    revisions,
    content,
    platform: "moj",
  };
}
