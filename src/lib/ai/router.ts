// AI Router — Quality-first dispatch to best provider per task
// Primary: Free APIs (Gemini, Groq, Mistral, Cerebras)
// Fallback: Local Ollama

import type { Provider } from "./rate-limiter";
import { isRateLimited, trackUsage } from "./rate-limiter";
import { logUsage } from "./usage-tracker";
import { geminiChat, geminiChatWithImage } from "./providers/gemini";
import { groqChat } from "./providers/groq";
import { mistralChat } from "./providers/mistral";
import { cerebrasChat } from "./providers/cerebras";
import { ollamaChat, ollamaIsAvailable } from "./providers/ollama";
import { anthropicVision } from "./providers/anthropic";
import { openrouterChat, openrouterChatWithImage, OPENROUTER_MODELS } from "./providers/openrouter";
import { xaiChat, XAI_MODELS } from "./providers/xai";

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

// ── Task Routing Table ─────────────────────────────────

const TASK_ROUTES: Record<TaskType, RouteConfig> = {
  chat: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 1024,
    reason: "Gemini for real-time chat (only configured provider)",
  },
  analysis: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    reason: "Gemini best reasoning",
  },
  code: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 4096,
    systemPrompt:
      "You are an expert TypeScript/React developer. Write clean, production-ready code.",
    reason: "Gemini for code (only configured provider)",
  },
  content: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
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
    reason: "Claude for premium content quality, Gemini free fallback",
  },
  premium: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    systemPrompt: `You are the world's best content writer. Every word you write feels human, authentic, and compelling. You write for BarbieVerse — a creator economy platform.

CRITICAL RULES:
1. This is HIGH-VALUE content — every word must earn its place
2. Write like a top copywriter, not an AI
3. Use psychological triggers: curiosity, social proof, urgency, specificity
4. Never use generic phrases — every sentence must be unique
5. Read like a real person wrote it, not a brand

OUTPUT FORMAT:
- Hook → Story → Value → CTA
- Under 150 words for DMs
- Under 300 words for captions
- Under 500 words for articles

Write content that converts. Make them feel something.`,
    reason: "Claude Sonnet for highest quality premium content",
  },
  reasoning: {
    primary: "gemini",
    fallback: "openrouter",
    model: "gemini-2.5-flash",
    maxTokens: 4096,
    reason: "Gemini wins GPQA benchmark, OpenRouter for Claude/GPT-4 fallback",
  },
  embedding: {
    primary: "ollama",
    fallback: "ollama",
    model: "nomic-embed-text",
    maxTokens: 512,
    reason: "Ollama embeddings free and fast",
  },
  vision: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 1024,
    reason: "Gemini vision for image analysis",
  },
  fallback: {
    primary: "gemini",
    fallback: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 1024,
    reason: "Gemini as last resort (only configured provider)",
  },
};

// ── Provider Callers ───────────────────────────────────

async function callProvider(
  provider: Provider,
  prompt: string,
  config: RouteConfig,
  imageBase64?: string,
  mimeType?: string,
): Promise<string> {
  const opts = {
    maxTokens: config.maxTokens,
    systemPrompt: config.systemPrompt,
    model: config.model,
  };

  switch (provider) {
    case "gemini":
      if (imageBase64) {
        return geminiChatWithImage(prompt, imageBase64, mimeType, opts);
      }
      return geminiChat(prompt, opts);

    case "groq":
      return groqChat(prompt, opts);

    case "mistral":
      return mistralChat(prompt, opts);

    case "cerebras":
      return cerebrasChat(prompt, opts);

    case "ollama":
      return ollamaChat(prompt, opts);

    case "anthropic":
      if (imageBase64) {
        return anthropicVision(prompt, imageBase64, mimeType, opts);
      }
      throw new Error("Anthropic text-only not supported, use vision");

    case "openrouter":
      if (imageBase64) {
        return openrouterChatWithImage(prompt, imageBase64, mimeType, opts);
      }
      return openrouterChat(prompt, opts);

    case "xai":
      return xaiChat(prompt, opts);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
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

  // Override config with custom values
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

  // Try primary provider
  if (!isRateLimited(config.primary)) {
    const start = Date.now();
    try {
      const text = await callProvider(
        config.primary,
        prompt,
        config,
        imageBase64,
        mimeType,
      );
      const latencyMs = Date.now() - start;
      const tokens = estimateTokens(text);

      trackUsage(config.primary, tokens);
      logUsage({
        provider: config.primary,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: tokens,
        latency_ms: latencyMs,
        success: true,
      });

      return {
        text,
        provider: config.primary,
        model: config.model,
        tokens,
        latencyMs,
      };
    } catch (err: any) {
      console.error(`[AIRouter] ${config.primary} failed:`, err.message);
      logUsage({
        provider: config.primary,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: 0,
        latency_ms: Date.now() - start,
        success: false,
        error: err.message,
      });
      // Fall through to fallback
    }
  }

  // Try fallback provider
  if (!isRateLimited(config.fallback)) {
    const start = Date.now();
    try {
      const text = await callProvider(
        config.fallback,
        prompt,
        config,
        imageBase64,
        mimeType,
      );
      const latencyMs = Date.now() - start;
      const tokens = estimateTokens(text);

      trackUsage(config.fallback, tokens);
      logUsage({
        provider: config.fallback,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: tokens,
        latency_ms: latencyMs,
        success: true,
      });

      return {
        text,
        provider: config.fallback,
        model: config.model,
        tokens,
        latencyMs,
      };
    } catch (err: any) {
      console.error(`[AIRouter] ${config.fallback} failed:`, err.message);
      logUsage({
        provider: config.fallback,
        task_type: taskType,
        model: config.model,
        input_tokens: estimateTokens(prompt),
        output_tokens: 0,
        latency_ms: Date.now() - start,
        success: false,
        error: err.message,
      });
    }
  }

  // All providers failed — last resort Ollama
  const start = Date.now();
  try {
    const available = await ollamaIsAvailable();
    if (!available) {
      throw new Error("All AI providers failed. AI features are temporarily unavailable.");
    }

    const text = await ollamaChat(prompt, {
      maxTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
      model: "phi4-mini",
    });
    const latencyMs = Date.now() - start;
    const tokens = estimateTokens(text);

    trackUsage("ollama", tokens);
    logUsage({
      provider: "ollama",
      task_type: taskType,
      model: "phi4-mini",
      input_tokens: estimateTokens(prompt),
      output_tokens: tokens,
      latency_ms: latencyMs,
      success: true,
    });

    return {
      text,
      provider: "ollama",
      model: "phi4-mini",
      tokens,
      latencyMs,
    };
  } catch (err: any) {
    logUsage({
      provider: "ollama",
      task_type: taskType,
      model: "phi4-mini",
      input_tokens: estimateTokens(prompt),
      output_tokens: 0,
      latency_ms: Date.now() - start,
      success: false,
      error: err.message,
    });
    throw new Error(`All AI providers failed. Last error: ${err.message}`);
  }
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

// Premium content — uses Claude Sonnet for highest quality
// Use for: outreach messages, captions, daily briefings, important copy
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
