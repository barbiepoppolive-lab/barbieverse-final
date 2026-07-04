// AI Router — Config-driven dispatch to best provider per task
// Reads provider priority from env vars, auto-skips unavailable providers.

import type { Provider, ChatOptions } from "./providers";
import {
  chat,
  chatWithImage,
  isAvailable,
  PROVIDER_REGISTRY,
  ollamaIsAvailable,
  estimateCost,
} from "./providers";
import { isRateLimited, trackUsage } from "./rate-limiter";
import { logUsage } from "./usage-tracker";

// ── Types ──────────────────────────────────────────────

export type TaskType =
  | "chat"
  | "analysis"
  | "code"
  | "content"
  | "premium"
  | "reasoning"
  | "embedding"
  | "vision"
  | "fallback";

interface RouteConfig {
  primary: Provider;
  fallback: Provider;
  model: string;
  maxTokens: number;
  systemPrompt?: string;
  reason: string;
}

export interface AIRouteResult {
  text: string;
  provider: Provider;
  model: string;
  tokens: number;
  latencyMs: number;
}

// ── Config-Driven Routing Table ────────────────────────
// Override with env vars: AI_ROUTE_{TASK}_PRIMARY=groq, AI_ROUTE_{TASK}_FALLBACK=gemini

function envProvider(envKey: string, defaultValue: Provider): Provider {
  const val = process.env[envKey];
  if (val && val in PROVIDER_REGISTRY) return val as Provider;
  return defaultValue;
}

function getTaskRoutes(): Record<TaskType, RouteConfig> {
  return {
    chat: {
      primary: envProvider("AI_ROUTE_CHAT_PRIMARY", "groq"),
      fallback: envProvider("AI_ROUTE_CHAT_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_CHAT_MODEL || "llama-3.3-70b-versatile",
      maxTokens: 1024,
      reason: "Groq fastest for real-time chat, Gemini fallback",
    },
    analysis: {
      primary: envProvider("AI_ROUTE_ANALYSIS_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_ANALYSIS_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_ANALYSIS_MODEL || "gemini-2.5-flash",
      maxTokens: 2048,
      reason: "Gemini best reasoning",
    },
    code: {
      primary: envProvider("AI_ROUTE_CODE_PRIMARY", "openrouter"),
      fallback: envProvider("AI_ROUTE_CODE_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_CODE_MODEL || "qwen/qwen-2.5-coder-32b-instruct",
      maxTokens: 4096,
      systemPrompt:
        "You are an expert TypeScript/React developer. Write clean, production-ready code. Follow existing code patterns and conventions. Never add comments unless asked.",
      reason: "OpenRouter Qwen Coder for best code quality, Gemini fallback",
    },
    content: {
      primary: envProvider("AI_ROUTE_CONTENT_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_CONTENT_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_CONTENT_MODEL || "gemini-2.5-flash",
      maxTokens: 2048,
      systemPrompt: `You are a world-class content strategist and writer for BarbieVerse — a creator economy platform that helps people earn money through live streaming on Poppo Live and Vone Live.

YOUR ROLE:
- Write content that stops the scroll and starts conversations
- Balance brand goals with genuine value for the audience
- Sound like a real person, not a marketing department
- Use data, stories, and specific examples (never vague claims)

CONTENT PRINCIPLES:
1. HOOK FIRST — The first line must make them stop and read
2. VALUE OVER PROMOTION — Give 80% value, 20% promotion
3. STORYTELLING — Real examples, specific numbers, personal moments
4. CONVERSATIONAL — Write like you're talking to a friend, not a customer
5. ACTIONABLE — Every piece should have a clear "what to do next"
6. AUTHENTIC — Admit challenges, share failures, celebrate small wins

WRITING RULES:
- Short paragraphs (2-3 sentences max)
- Use subheadings for scanability
- Mix sentence lengths for rhythm
- Use active voice
- Include specific numbers when possible
- Avoid jargon unless the audience expects it
- Never use corporate speak ("leverage", "synergy", "unlock")

BRAND VOICE:
- Empowering, not preachy
- Fun, not childish  
- Authentic, not polished
- Helpful, not salesy
- Direct, not aggressive

AUDIENCE: Young Indian creators (18-30) who want to earn money through live streaming. They're tech-savvy but skeptical of scams. They value authenticity over polish.

Write like a human who genuinely cares about helping people succeed.`,
      reason: "Gemini for content quality (free)",
    },
    premium: {
      primary: envProvider("AI_ROUTE_PREMIUM_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_PREMIUM_FALLBACK", "groq"),
      model: process.env.AI_ROUTE_PREMIUM_MODEL || "gemini-2.5-flash",
      maxTokens: 8192,
      systemPrompt: `You are the world's best content writer. Every word you write feels human, authentic, and compelling. You write for BarbieVerse — a creator economy platform helping young Indian creators earn money through live streaming.

CRITICAL RULES:
1. This is HIGH-VALUE content — every word must earn its place
2. Write like a top copywriter, not an AI
3. Use psychological triggers: curiosity, social proof, urgency, specificity
4. Never use generic phrases — every sentence must be unique
5. Read like a real person wrote it, not a brand
6. Use power words, emotional hooks, and concrete numbers
7. Structure: Hook → Story → Value → CTA
8. For carousels: each slide must standalone but flow as a narrative
9. For reels: hook in first 3 seconds, tension throughout, payoff at end

OUTPUT FORMAT:
- Hook → Story → Value → CTA
- Under 150 words for DMs
- Under 300 words for captions
- Under 500 words for articles

Write content that converts. Make them feel something.`,
      reason: "OpenRouter free models auto-selects best available (Nemotron, Qwen, Gemini, etc.)",
    },
    reasoning: {
      primary: envProvider("AI_ROUTE_REASONING_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_REASONING_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_REASONING_MODEL || "gemini-2.5-flash",
      maxTokens: 4096,
      reason: "Gemini wins GPQA benchmark",
    },
    embedding: {
      primary: envProvider("AI_ROUTE_EMBEDDING_PRIMARY", "ollama"),
      fallback: envProvider("AI_ROUTE_EMBEDDING_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_EMBEDDING_MODEL || "nomic-embed-text",
      maxTokens: 512,
      reason: "Ollama embeddings free and fast",
    },
    vision: {
      primary: envProvider("AI_ROUTE_VISION_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_VISION_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_VISION_MODEL || "gemini-2.5-flash",
      maxTokens: 1024,
      reason: "Gemini vision for image analysis",
    },
    fallback: {
      primary: envProvider("AI_ROUTE_FALLBACK_PRIMARY", "gemini"),
      fallback: envProvider("AI_ROUTE_FALLBACK_FALLBACK", "gemini"),
      model: process.env.AI_ROUTE_FALLBACK_MODEL || "gemini-2.5-flash",
      maxTokens: 1024,
      reason: "Gemini as last resort",
    },
  };
}

// ── Token Estimation ───────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Main Router ────────────────────────────────────────

export async function aiRoute(params: {
  prompt: string;
  taskType: TaskType;
  maxTokens?: number;
  systemPrompt?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AIRouteResult> {
  const { prompt, taskType, maxTokens, systemPrompt, imageBase64, mimeType } =
    params;

  const TASK_ROUTES = getTaskRoutes();
  const baseConfig = TASK_ROUTES[taskType];
  const config: RouteConfig = {
    ...baseConfig,
    ...(maxTokens && { maxTokens }),
    ...(systemPrompt && { systemPrompt }),
  };

  // Vision tasks must have image
  if (taskType === "vision" && !imageBase64) {
    throw new Error("Vision task requires imageBase64");
  }

  const opts: ChatOptions = {
    maxTokens: config.maxTokens,
    systemPrompt: config.systemPrompt,
    model: config.model,
  };

  // Build provider chain: primary → fallback → ollama (if available)
  const providers: Provider[] = [];
  if (isAvailable(config.primary) && !isRateLimited(config.primary)) {
    providers.push(config.primary);
  }
  if (
    config.fallback !== config.primary &&
    isAvailable(config.fallback) &&
    !isRateLimited(config.fallback)
  ) {
    providers.push(config.fallback);
  }
  // Ollama last resort
  if (
    config.primary !== "ollama" &&
    config.fallback !== "ollama" &&
    (await ollamaIsAvailable()) &&
    !isRateLimited("ollama")
  ) {
    providers.push("ollama");
  }

  // Try each provider in order
  for (const provider of providers) {
    const start = Date.now();
    try {
      let text: string;
      if (imageBase64 && (taskType === "vision" || PROVIDER_REGISTRY[provider].supportsVision)) {
        text = await chatWithImage(provider, prompt, imageBase64, mimeType || "image/jpeg", opts);
      } else {
        text = await chat(provider, prompt, opts);
      }

      const latencyMs = Date.now() - start;
      const tokens = estimateTokens(text);

      trackUsage(provider, tokens);
      logUsage({
        provider,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: tokens,
        latency_ms: latencyMs,
        success: true,
      });

      return { text, provider, model: config.model, tokens, latencyMs };
    } catch (err: any) {
      console.error(`[AIRouter] ${provider} failed:`, err.message);
      logUsage({
        provider,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: 0,
        latency_ms: Date.now() - start,
        success: false,
        error: err.message,
      });
      // Continue to next provider
    }
  }

  throw new Error(
    `All AI providers failed for task "${taskType}". Available: ${providers.join(", ") || "none"}`,
  );
}

// ── Convenience Functions ──────────────────────────────

export async function aiChat(
  prompt: string,
  opts?: { systemPrompt?: string; maxTokens?: number },
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "chat",
    systemPrompt: opts?.systemPrompt,
    maxTokens: opts?.maxTokens,
  });
}

export async function aiAnalyze(
  prompt: string,
  opts?: { maxTokens?: number },
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "analysis",
    maxTokens: opts?.maxTokens,
  });
}

export async function aiCode(
  prompt: string,
  opts?: { maxTokens?: number },
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "code",
    maxTokens: opts?.maxTokens,
  });
}

export async function aiContent(
  prompt: string,
  opts?: { systemPrompt?: string; maxTokens?: number },
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "content",
    systemPrompt: opts?.systemPrompt,
    maxTokens: opts?.maxTokens,
  });
}

export async function aiPremium(
  prompt: string,
  opts?: { systemPrompt?: string; maxTokens?: number },
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "premium",
    systemPrompt: opts?.systemPrompt,
    maxTokens: opts?.maxTokens,
  });
}

export async function aiVision(
  prompt: string,
  imageBase64: string,
  mimeType?: string,
): Promise<AIRouteResult> {
  return aiRoute({
    prompt,
    taskType: "vision",
    imageBase64,
    mimeType,
  });
}
