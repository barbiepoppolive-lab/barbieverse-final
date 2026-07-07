// Hook Engine — 7 viral hook frameworks with rotation tracking
// Rule: Never repeat same category twice in a row.
// Critical: First 1.5 seconds决定生死 on Instagram/TikTok.

import { aiContent } from "./router";

// ── Types ──────────────────────────────────────────────

export type HookFramework =
  | "curiosity_gap"
  | "mistake_alert"
  | "story_opener"
  | "authority_proof"
  | "relatable_pain"
  | "educational_bomb"
  | "challenge_hook";

export type HookPlatform = "instagram" | "tiktok" | "youtube" | "twitter" | "moj" | "facebook" | "linkedin";

export interface HookInput {
  topic: string;
  platform?: HookPlatform;
  style?: "educational" | "entertaining" | "inspirational" | "promotional";
  excludeFrameworks?: HookFramework[];
}

export interface HookResult {
  hook: string;
  framework: HookFramework;
  confidence: number;
  platform: HookPlatform;
  reasoning: string;
}

export interface HookRotation {
  lastFramework: HookFramework | null;
  recentFrameworks: HookFramework[];
  turnCount: number;
}

// ── Hook Framework Definitions ─────────────────────────

export const HOOK_FRAMEWORKS: Record<
  HookFramework,
  {
    name: string;
    description: string;
    examples: string[];
    bestFor: string[];
    platformStrength: HookPlatform[];
  }
> = {
  curiosity_gap: {
    name: "Curiosity Gap",
    description: "Open a knowledge gap the viewer MUST close by watching",
    examples: [
      "Nobody tells you this about live streaming...",
      "I made ₹50,000 last month doing this one thing...",
      "The reason you're broke is simpler than you think...",
      "This one filter changed my entire content game...",
    ],
    bestFor: ["tutorials", "tips", "how-to", "income reports"],
    platformStrength: ["instagram", "tiktok", "youtube"],
  },
  mistake_alert: {
    name: "Mistake Alert",
    description: "Point out a common mistake to trigger fear of missing out",
    examples: [
      "Stop doing this if you want followers...",
      "The #1 mistake killing your engagement...",
      "You're losing money if you do this...",
      "NEVER post at this time...",
    ],
    bestFor: ["tutorials", "corrections", "tips", "engagement"],
    platformStrength: ["instagram", "tiktok", "twitter"],
  },
  story_opener: {
    name: "Story Opener",
    description: "Start a narrative that demands a conclusion",
    examples: [
      "Last night at 2am, something crazy happened...",
      "A year ago I was sleeping on the floor. This week I bought a car...",
      "My manager laughed when I said I'd quit. Watch this...",
      "Day 1 of trying to go viral...",
    ],
    bestFor: ["journey", "transformation", "behind-the-scenes", "motivation"],
    platformStrength: ["instagram", "tiktok", "youtube"],
  },
  authority_proof: {
    name: "Authority Proof",
    description: "Lead with credentials, results, or social proof",
    examples: [
      "As someone who's grown 100K followers in 90 days...",
      "I've spent ₹2 lakhs on ads. Here's what actually works...",
      "After 500+ livestreams, here's the truth...",
      "Top 1% creator here. Listen carefully...",
    ],
    bestFor: ["expert content", "guides", "strategies", "case studies"],
    platformStrength: ["linkedin", "youtube", "twitter"],
  },
  relatable_pain: {
    name: "Relatable Pain",
    description: "Name a specific frustration the audience feels right now",
    examples: [
      "You post every day but get zero followers...",
      "Tired of going viral but making no money?",
      "When your reel gets 100K views but 3 likes...",
      "POV: You just spent 4 hours editing a reel with 12 views...",
    ],
    bestFor: ["memes", "relatable content", "engagement", "community"],
    platformStrength: ["instagram", "tiktok", "twitter", "moj"],
  },
  educational_bomb: {
    name: "Educational Bomb",
    description: "Promise a high-value, specific piece of knowledge",
    examples: [
      "Here's the exact strategy that made me go viral...",
      "Save this — you'll need it later...",
      "The algorithm doesn't want you to know this...",
      "Free masterclass: how to get brand deals...",
    ],
    bestFor: ["tutorials", "how-to", "guides", "value content"],
    platformStrength: ["instagram", "youtube", "tiktok"],
  },
  challenge_hook: {
    name: "Challenge Hook",
    description: "Pose a challenge or dare to the viewer",
    examples: [
      "Try this for 30 days and watch your life change...",
      "Can you watch this without saving it?",
      "I bet you can't do this one thing...",
      "30-day challenge: from 0 to 10K followers...",
    ],
    bestFor: ["challenges", "engagement", "community", "growth"],
    platformStrength: ["tiktok", "instagram", "moj"],
  },
};

// ── Rotation Tracker (in-memory, per-session) ─────────

const rotationState: HookRotation = {
  lastFramework: null,
  recentFrameworks: [],
  turnCount: 0,
};

export function resetRotation(): void {
  rotationState.lastFramework = null;
  rotationState.recentFrameworks = [];
  rotationState.turnCount = 0;
}

export function getRotationState(): HookRotation {
  return { ...rotationState };
}

function selectNextFramework(exclude: HookFramework[] = []): HookFramework {
  const available = (Object.keys(HOOK_FRAMEWORKS) as HookFramework[]).filter(
    (f) =>
      !exclude.includes(f) &&
      f !== rotationState.lastFramework &&
      !rotationState.recentFrameworks.slice(0, 2).includes(f)
  );

  if (available.length === 0) {
    // Reset if all excluded
    rotationState.recentFrameworks = [];
    return selectNextFramework(exclude);
  }

  // Weighted random: prefer frameworks not used recently
  const weights = available.map((f, i) => {
    const lastUsedIndex = rotationState.recentFrameworks.indexOf(f);
    return lastUsedIndex === -1 ? 3 : lastUsedIndex === 0 ? 0.5 : 1;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  let selected = available[0];

  for (let i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selected = available[i];
      break;
    }
  }

  // Update rotation state
  rotationState.lastFramework = selected;
  rotationState.recentFrameworks.unshift(selected);
  if (rotationState.recentFrameworks.length > 5) {
    rotationState.recentFrameworks.pop();
  }
  rotationState.turnCount++;

  return selected;
}

// ── Hook Generation ────────────────────────────────────

/**
 * Generate a hook using the next framework in rotation.
 * Ensures no framework is repeated twice in a row.
 */
export async function generateHook(input: HookInput): Promise<HookResult> {
  const platform = input.platform || "instagram";
  const exclude = [
    ...(input.excludeFrameworks || []),
    ...(rotationState.lastFramework ? [rotationState.lastFramework] : []),
  ];

  const framework = selectNextFramework(exclude);
  const frameworkInfo = HOOK_FRAMEWORKS[framework];

  const result = await aiContent(
    `Generate ONE viral ${platform} hook for: ${input.topic}

FRAMEWORK: ${frameworkInfo.name}
STYLE: ${input.style || "educational"}

FRAMEWORK DESCRIPTION:
${frameworkInfo.description}

EXAMPLES OF THIS FRAMEWORK:
${frameworkInfo.examples.map((e) => `- "${e}"`).join("\n")}

PLATFORM: ${platform}
${platform === "tiktok" || platform === "instagram" ? "Optimize for first 1.5 seconds — the hook must stop the scroll immediately." : ""}
${platform === "youtube" ? "Optimize for click-through — thumbnail + title must work together." : ""}
${platform === "twitter" ? "Under 280 chars — punchy and retweetable." : ""}

RULES:
1. Use the EXACT framework style shown above
2. Sound like a real person, not a brand
3. Use numbers or specifics when possible
4. No clickbait — deliver on the promise
5. Match the platform's native tone

Return EXACTLY this JSON:
{
  "hook": "the hook text",
  "confidence": 0.85,
  "reasoning": "why this hook works for this framework and platform"
}`,
    { maxTokens: 400 }
  );

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: return a simple hook
    return {
      hook: frameworkInfo.examples[Math.floor(Math.random() * frameworkInfo.examples.length)],
      framework,
      confidence: 0.5,
      platform,
      reasoning: "Fallback hook from examples",
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    hook: parsed.hook || "",
    framework,
    confidence: parsed.confidence || 0.7,
    platform,
    reasoning: parsed.reasoning || "",
  };
}

/**
 * Generate multiple hooks (one per framework) for A/B testing.
 */
export async function generateHookVariants(
  input: HookInput,
  count: number = 3
): Promise<HookResult[]> {
  const results: HookResult[] = [];
  const usedFrameworks: HookFramework[] = [];

  for (let i = 0; i < count; i++) {
    const exclude = [...(input.excludeFrameworks || []), ...usedFrameworks];
    const result = await generateHook({ ...input, excludeFrameworks: exclude });
    results.push(result);
    usedFrameworks.push(result.framework);
  }

  return results;
}

/**
 * Get the best hook framework for a specific platform.
 */
export function getBestFrameworkForPlatform(platform: HookPlatform): HookFramework[] {
  return (Object.entries(HOOK_FRAMEWORKS) as [HookFramework, typeof HOOK_FRAMEWORKS[HookFramework]][])
    .filter(([, info]) => info.platformStrength.includes(platform))
    .map(([framework]) => framework);
}

/**
 * Get platform-specific hook tips.
 */
export function getPlatformHookTips(platform: HookPlatform): string[] {
  const tips: Record<HookPlatform, string[]> = {
    instagram: [
      "First 1.5 seconds = make or break",
      "Use text overlay on the hook",
      "Hook works with AND without sound",
      "Cover image must match hook promise",
      "Trending audio boosts hook performance",
    ],
    tiktok: [
      "First 0.5 seconds = algorithm judges retention",
      "Hook must work in silent mode",
      "Use on-screen text for the hook",
      "Pattern interrupts boost watch time",
      "Loop-friendly hooks get rewatched",
    ],
    youtube: [
      "Hook = thumbnail + title combo",
      "First 30 seconds = retention curve peak",
      "Open loop: promise what's coming",
      "Pattern interrupt in first 5s",
      "Verbal hook within 3 seconds",
    ],
    twitter: [
      "First line = everything (fold hides rest)",
      "Hook must work in a timeline scroll",
      "Use line breaks for visual emphasis",
      "Question hooks get more replies",
      "Number hooks get more bookmarks",
    ],
    moj: [
      "Hindi/regional language hooks perform better",
      "First 2 seconds critical for algorithm",
      "Music-synced hooks get more shares",
      "Emotional hooks > educational hooks",
      "Local references boost relatability",
    ],
    linkedin: [
      "Professional hook — lead with insight or result",
      "Data-backed hooks get more engagement",
      "Story-driven hooks perform well",
      "Challenge conventional wisdom",
      "Use specific numbers and outcomes",
    ],
    facebook: [
      "Longer hooks work (3-5 lines before fold)",
      "Story-based hooks get more shares",
      "Question hooks drive comments",
      "Nostalgia hooks perform well",
      "Community-focused hooks boost reach",
    ],
  };

  return tips[platform] || tips.instagram;
}
