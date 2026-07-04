// Content Quality Engine — AI-powered quality scoring and improvement suggestions
// Scores content on hook strength, value density, CTA clarity, and overall impact

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export interface QualityScore {
  overall: number;
  breakdown: {
    hook_strength: number;
    value_density: number;
    cta_clarity: number;
    readability: number;
    emotional_impact: number;
  };
  badge: "needs-work" | "good" | "great" | "excellent";
  suggestions: string[];
  improved_version?: string;
}

export interface ContentImprovement {
  original: string;
  improved: string;
  changes: string[];
  tone: string;
}

// ── Quality Scoring ─────────────────────────────────────

export async function scoreContent(input: {
  content: string;
  content_type: string;
  platform: string;
  topic: string;
}): Promise<QualityScore> {
  const result = await aiContent(
    `Analyze this ${input.content_type} content for ${input.platform} about: ${input.topic}

CONTENT:
${input.content}

Score each dimension from 1-10 and provide suggestions. Return EXACTLY this JSON:
{
  "hook_strength": 8,
  "value_density": 7,
  "cta_clarity": 9,
  "readability": 8,
  "emotional_impact": 7,
  "suggestions": [
    "Specific suggestion 1",
    "Specific suggestion 2",
    "Specific suggestion 3"
  ]
}

SCORING CRITERIA:
- Hook Strength (1-10): Does the first line stop the scroll? Is it curiosity-driven?
- Value Density (1-10): Every word earns its place? No fluff?
- CTA Clarity (1-10): Clear next step? Compelling reason to act?
- Readability (1-10): Short sentences? Simple words? Scannable?
- Emotional Impact (1-10): Does it make you feel something? Urgency? Excitement?

RULES:
- Be brutally honest — this is for premium content
- Suggestions must be specific and actionable
- Focus on what would make this go viral
- Consider platform-specific best practices
- For Indian audience: cultural relevance matters`,
    { maxTokens: 1024 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  const defaults = {
    hook_strength: 7,
    value_density: 7,
    cta_clarity: 7,
    readability: 8,
    emotional_impact: 6,
    suggestions: ["Add a stronger hook", "Include specific numbers", "End with a clear CTA"],
  };

  let scores = defaults;
  if (jsonMatch) {
    try {
      scores = JSON.parse(jsonMatch[0]);
    } catch {}
  }

  const overall = Math.round(
    (scores.hook_strength + scores.value_density + scores.cta_clarity +
     scores.readability + scores.emotional_impact) / 5 * 10
  );

  let badge: QualityScore["badge"] = "needs-work";
  if (overall >= 90) badge = "excellent";
  else if (overall >= 75) badge = "great";
  else if (overall >= 60) badge = "good";

  return {
    overall,
    breakdown: {
      hook_strength: scores.hook_strength,
      value_density: scores.value_density,
      cta_clarity: scores.cta_clarity,
      readability: scores.readability,
      emotional_impact: scores.emotional_impact,
    },
    badge,
    suggestions: scores.suggestions || [],
  };
}

// ── Content Improvement ─────────────────────────────────

export async function improveContent(input: {
  content: string;
  tone?: string;
  instruction?: string;
  content_type: string;
}): Promise<ContentImprovement> {
  const tone = input.tone || "engaging";
  const instruction = input.instruction || "Improve this content for maximum engagement";

  const result = await aiContent(
    `${instruction}

TONE: ${tone}
CONTENT TYPE: ${input.content_type}

ORIGINAL:
${input.content}

Improve this content. Make it:
- More engaging and hook-driven
- Better structured for ${input.content_type}
- Optimized for social media
- With strong emotional triggers

Return EXACTLY this JSON:
{
  "improved": "the improved content here",
  "changes": ["change 1", "change 2", "change 3"]
}`,
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to generate improvement");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    original: input.content,
    improved: parsed.improved || input.content,
    changes: parsed.changes || [],
    tone,
  };
}

// ── Quick Tone Variations ───────────────────────────────

export async function generateToneVariations(input: {
  content: string;
  content_type: string;
}): Promise<Record<string, string>> {
  const result = await aiContent(
    `Generate 3 tone variations of this content:

ORIGINAL:
${input.content}

Create these variations:
1. Professional (formal, authoritative)
2. Casual (friendly, conversational)
3. Urgent (FOMO, action-driven)

Return EXACTLY this JSON:
{
  "professional": "professional version",
  "casual": "casual version",
  "urgent": "urgent version"
}`,
    { maxTokens: 2048 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to generate variations");

  return JSON.parse(jsonMatch[0]);
}

// ── Content Scoring Helper ──────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 75) return "text-blue-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

export function getScoreBg(score: number): string {
  if (score >= 90) return "bg-green-500/10";
  if (score >= 75) return "bg-blue-500/10";
  if (score >= 60) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

export function getBadgeLabel(badge: string): string {
  switch (badge) {
    case "excellent": return "Excellent — Ready to post";
    case "great": return "Great — Minor improvements possible";
    case "good": return "Good — Could use some tweaks";
    case "needs-work": return "Needs work — Review suggestions";
    default: return "Unknown";
  }
}

export function getBadgeColor(badge: string): string {
  switch (badge) {
    case "excellent": return "bg-green-500/10 text-green-600 border-green-500/30";
    case "great": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    case "good": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    case "needs-work": return "bg-red-500/10 text-red-600 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}
