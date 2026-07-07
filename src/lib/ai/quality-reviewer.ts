// Quality Reviewer — AI content quality gate
// Checks: first 1.5s retention potential, CTA presence, brand consistency,
// grammar, platform suitability, hook effectiveness.
// Score 0-100. Below 70 = needs revision.

import { aiContent, aiVision } from "./router";

// ── Types ──────────────────────────────────────────────

export type Platform = "instagram" | "tiktok" | "youtube" | "twitter" | "moj" | "facebook" | "linkedin";

export interface QualityCheckInput {
  content: string;
  platform: Platform;
  contentType: "reel" | "carousel" | "story" | "post" | "thread" | "blog";
  hook?: string;
  image_url?: string;
  hashtags?: string[];
}

export interface QualityScore {
  overall: number; // 0-100
  dimensions: {
    hook_effectiveness: number;
    retention_potential: number;
    cta_presence: number;
    brand_consistency: number;
    grammar_clarity: number;
    platform_suitability: number;
    visual_quality?: number; // Only if image provided
  };
  issues: QualityIssue[];
  suggestions: string[];
  verdict: "pass" | "revise" | "reject";
  summary: string;
}

export interface QualityIssue {
  dimension: string;
  severity: "critical" | "major" | "minor";
  message: string;
  fix_suggestion: string;
}

// ── Quality Reviewer ───────────────────────────────────

/**
 * Review content quality across 6 dimensions.
 * Returns a detailed score with issues and suggestions.
 */
export async function reviewContent(input: QualityCheckInput): Promise<QualityScore> {
  const prompt = buildReviewPrompt(input);

  const result = await aiContent(prompt, { maxTokens: 2048 });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackScore(input);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Calculate overall score (weighted average)
  const dims = parsed.dimensions || {};
  const weights = {
    hook_effectiveness: 0.25,
    retention_potential: 0.25,
    cta_presence: 0.15,
    brand_consistency: 0.15,
    grammar_clarity: 0.10,
    platform_suitability: 0.10,
  };

  let overall = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (dims[key] !== undefined) {
      overall += dims[key] * weight;
      totalWeight += weight;
    }
  }
  overall = totalWeight > 0 ? Math.round(overall / totalWeight * 100) : 50;

  // Determine verdict
  let verdict: "pass" | "revise" | "reject" = "pass";
  if (overall < 50) verdict = "reject";
  else if (overall < 70) verdict = "revise";

  const issues: QualityIssue[] = (parsed.issues || []).map((issue: any) => ({
    dimension: issue.dimension || "general",
    severity: issue.severity || "minor",
    message: issue.message || "",
    fix_suggestion: issue.fix_suggestion || "",
  }));

  // Boost score if critical issues are fixed suggestions
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  if (criticalCount > 0 && overall >= 50) {
    verdict = "revise";
  }

  return {
    overall,
    dimensions: {
      hook_effectiveness: dims.hook_effectiveness || 50,
      retention_potential: dims.retention_potential || 50,
      cta_presence: dims.cta_presence || 50,
      brand_consistency: dims.brand_consistency || 50,
      grammar_clarity: dims.grammar_clarity || 50,
      platform_suitability: dims.platform_suitability || 50,
      visual_quality: dims.visual_quality,
    },
    issues,
    suggestions: parsed.suggestions || [],
    verdict,
    summary: parsed.summary || `Score: ${overall}/100 — ${verdict}`,
  };
}

/**
 * Quick quality check — returns only score and verdict (faster, cheaper).
 */
export async function quickQualityCheck(
  content: string,
  platform: Platform,
  contentType: "reel" | "carousel" | "story" | "post"
): Promise<{ score: number; verdict: "pass" | "revise" | "reject"; topIssue: string }> {
  const result = await aiContent(
    `Rate this ${platform} ${contentType} content from 0-100.

Content:
${content.slice(0, 500)}

Return EXACTLY this JSON:
{
  "score": 75,
  "verdict": "pass",
  "topIssue": "brief description of the #1 issue, or 'none' if score > 80"
}`,
    { maxTokens: 200 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { score: 50, verdict: "revise", topIssue: "Could not analyze" };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    score: parsed.score || 50,
    verdict: parsed.verdict || "revise",
    topIssue: parsed.topIssue || "",
  };
}

/**
 * Review visual content (image) for brand consistency.
 */
export async function reviewVisualQuality(
  image_url: string,
  brand_guidelines: string
): Promise<{
  score: number;
  brandMatch: number;
  issues: string[];
  suggestions: string[];
}> {
  const result = await aiVision(
    `Analyze this image for brand consistency and visual quality.

BRAND GUIDELINES:
${brand_guidelines}

Score from 0-100 for:
1. Overall visual quality
2. Brand guideline match

Return EXACTLY this JSON:
{
  "score": 75,
  "brandMatch": 80,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
    image_url
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { score: 50, brandMatch: 50, issues: [], suggestions: [] };
  }

  return JSON.parse(jsonMatch[0]);
}

// ── Helpers ────────────────────────────────────────────

function buildReviewPrompt(input: QualityCheckInput): string {
  const platformSpecificRules: Record<Platform, string> = {
    instagram: "Reels must hook in 1.5s. Carousels need bold cover slide. Stories need vertical 9:16.",
    tiktok: "First 0.5s is critical. Must work without sound. Native feel, not polished.",
    youtube: "Thumbnail + title must work together. Verbal hook in first 3s. Retention curve matters.",
    twitter: "First line = everything (fold). Under 280 chars per tweet. Thread needs flow.",
    moj: "Hindi/regional language preferred. Music-synced hooks work best. Local references help.",
    facebook: "Story-based hooks get shares. Longer hooks OK. Community-focused content wins.",
    linkedin: "Professional tone. Story-driven. Data-backed claims. 1-2 paragraphs per post.",
  };

  const contentTypeRules: Record<string, string> = {
    reel: "Check: hook speed, pacing, text overlays, music sync, CTA at end.",
    carousel: "Check: cover slide impact, flow between slides, CTA slide, text density.",
    story: "Check: vertical format, swipe-up CTA, text readability, visual consistency.",
    post: "Check: first line hook, line breaks, hashtags, engagement prompt.",
    thread: "Check: first tweet hook, thread flow, each tweet standalone value, closing CTA.",
    blog: "Check: headline, intro hook, subheadings, conclusion, CTA.",
  };

  return `Review this ${input.contentType} content for ${input.platform}.

CONTENT:
${input.content}

${input.hook ? `HOOK: ${input.hook}` : ""}
${input.hashtags?.length ? `HASHTAGS: ${input.hashtags.join(", ")}` : ""}

PLATFORM RULES:
${platformSpecificRules[input.platform]}

CONTENT TYPE RULES:
${contentTypeRules[input.contentType] || ""}

BRAND: BarbieVerse — empowering, fun, authentic, helpful, direct. Pink/black/gold aesthetic. Young Indian creators (18-30).

SCORING DIMENSIONS (0-100 each):
1. hook_effectiveness — Does the first line/second stop the scroll?
2. retention_potential — Will viewers watch/read to the end?
3. cta_presence — Is there a clear call to action?
4. brand_consistency — Does it match BarbieVerse voice and values?
5. grammar_clarity — Is it well-written and clear?
6. platform_suitability — Is it optimized for this specific platform?

Return EXACTLY this JSON:
{
  "dimensions": {
    "hook_effectiveness": 75,
    "retention_potential": 80,
    "cta_presence": 60,
    "brand_consistency": 85,
    "grammar_clarity": 90,
    "platform_suitability": 70
  },
  "issues": [
    {
      "dimension": "cta_presence",
      "severity": "major",
      "message": "No clear call to action at the end",
      "fix_suggestion": "Add 'Save this for later' or 'Follow for more tips' at the end"
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "summary": "Overall: solid content with good hook but needs stronger CTA. Platform optimization could improve."
}`;
}

function fallbackScore(input: QualityCheckInput): QualityScore {
  return {
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
    suggestions: ["Could not fully analyze — review manually"],
    verdict: "revise",
    summary: "Automated review unavailable. Manual review recommended.",
  };
}

/**
 * Auto-revise content that scored below threshold.
 */
export async function autoReviseContent(
  input: QualityCheckInput,
  score: QualityScore
): Promise<string> {
  const criticalIssues = score.issues.filter((i) => i.severity === "critical" || i.severity === "major");

  const fixInstructions = criticalIssues
    .map((i) => `- ${i.dimension}: ${i.fix_suggestion}`)
    .join("\n");

  const result = await aiContent(
    `Improve this ${input.platform} ${input.contentType} content.

ORIGINAL:
${input.content}

ISSUES TO FIX:
${fixInstructions || "No critical issues found"}

IMPROVEMENT SUGGESTIONS:
${score.suggestions.map((s) => `- ${s}`).join("\n") || "None"}

RULES:
1. Keep the core message intact
2. Fix all listed issues
3. Maintain BarbieVerse brand voice (empowering, fun, authentic)
4. Match ${input.platform} platform norms
5. Keep it similar length (don't pad)

Return ONLY the improved content, no JSON.`,
    { maxTokens: 1024 }
  );

  return result.text.trim() || input.content;
}
