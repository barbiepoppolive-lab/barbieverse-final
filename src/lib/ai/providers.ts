// AI Providers — Unified registry with config-driven auto-detection
// All providers in one file. Router reads this registry to pick the best provider.

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ──────────────────────────────────────────────

export type Provider =
  | "gemini"
  | "groq"
  | "mistral"
  | "cerebras"
  | "ollama"
  | "anthropic"
  | "openrouter"
  | "xai";

export interface ProviderConfig {
  name: Provider;
  apiKeyEnv: string | null;
  baseUrl: string;
  defaultModel: string;
  models: Record<string, string>;
  costPer1kInput: number;
  costPer1kOutput: number;
  limits: { rpm: number; rpd: number; tpm: number };
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  isOpenAICompatible: boolean;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

// ── Provider Registry ──────────────────────────────────

export const PROVIDER_REGISTRY: Record<Provider, ProviderConfig> = {
  gemini: {
    name: "gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    models: {
      fast: "gemini-2.0-flash",
      balanced: "gemini-2.5-flash",
      best: "gemini-2.5-pro",
      embedding: "text-embedding-004",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 10, rpd: 250, tpm: 250_000 },
    supportsVision: true,
    supportsEmbeddings: true,
    isOpenAICompatible: false,
  },
  groq: {
    name: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: {
      fast: "llama-3.3-70b-versatile",
      balanced: "llama-3.3-70b-versatile",
      embedding: "nomic-embed-text-v1.5",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 30, rpd: 14_400, tpm: 12_000 },
    supportsVision: false,
    supportsEmbeddings: true,
    isOpenAICompatible: true,
  },
  mistral: {
    name: "mistral",
    apiKeyEnv: "MISTRAL_API_KEY",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "codestral-latest",
    models: {
      fast: "mistral-small-latest",
      balanced: "mistral-large-latest",
      code: "codestral-latest",
      embedding: "mistral-embed",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 2, rpd: 999_999, tpm: 500_000 },
    supportsVision: false,
    supportsEmbeddings: true,
    isOpenAICompatible: true,
  },
  cerebras: {
    name: "cerebras",
    apiKeyEnv: "CEREBRAS_API_KEY",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    models: {
      fast: "llama-3.3-70b",
      balanced: "llama-3.3-70b",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 30, rpd: 1000, tpm: 100_000 },
    supportsVision: false,
    supportsEmbeddings: false,
    isOpenAICompatible: true,
  },
  ollama: {
    name: "ollama",
    apiKeyEnv: null,
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    defaultModel: "phi4-mini",
    models: {
      fast: "phi4-mini",
      balanced: "qwen3:8b",
      embedding: "nomic-embed-text",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 999, rpd: 999_999, tpm: 999_999 },
    supportsVision: false,
    supportsEmbeddings: true,
    isOpenAICompatible: false,
  },
  anthropic: {
    name: "anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    models: {
      fast: "claude-sonnet-4-20250514",
      balanced: "claude-sonnet-4-20250514",
      best: "claude-opus-4-20250514",
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    limits: { rpm: 50, rpd: 1000, tpm: 40_000 },
    supportsVision: true,
    supportsEmbeddings: false,
    isOpenAICompatible: false,
  },
  openrouter: {
    name: "openrouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: {
      fast: "meta-llama/llama-3.3-70b-instruct:free",
      balanced: "mistralai/mistral-large-2411",
      best: "anthropic/claude-sonnet-4-20250514",
      creative: "google/gemini-2.5-flash",
      code: "qwen/qwen-2.5-coder-32b-instruct",
      vision: "anthropic/claude-sonnet-4-20250514",
      free: "meta-llama/llama-3.3-70b-instruct:free",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 20, rpd: 1000, tpm: 200_000 },
    supportsVision: true,
    supportsEmbeddings: false,
    isOpenAICompatible: true,
  },
  xai: {
    name: "xai",
    apiKeyEnv: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3-mini",
    models: {
      fast: "grok-3-mini",
      balanced: "grok-3-mini",
      best: "grok-3",
      code: "grok-3-mini",
    },
    costPer1kInput: 0,
    costPer1kOutput: 0,
    limits: { rpm: 10, rpd: 1000, tpm: 100_000 },
    supportsVision: false,
    supportsEmbeddings: false,
    isOpenAICompatible: true,
  },
};

// ── Availability Detection ─────────────────────────────

const availabilityCache: Record<Provider, boolean | null> = {
  gemini: null,
  groq: null,
  mistral: null,
  cerebras: null,
  ollama: null,
  anthropic: null,
  openrouter: null,
  xai: null,
};

export function isAvailable(provider: Provider): boolean {
  if (availabilityCache[provider] !== null) {
    return availabilityCache[provider]!;
  }

  const config = PROVIDER_REGISTRY[provider];

  // Ollama is special — no API key needed, check if running
  if (provider === "ollama") {
    // Can't check synchronously, assume available
    availabilityCache[provider] = true;
    return true;
  }

  const hasKey = config.apiKeyEnv ? !!process.env[config.apiKeyEnv] : true;
  availabilityCache[provider] = hasKey;
  return hasKey;
}

export function getAvailableProviders(): Provider[] {
  return (Object.keys(PROVIDER_REGISTRY) as Provider[]).filter(isAvailable);
}

export function resetAvailabilityCache(): void {
  for (const key of Object.keys(availabilityCache) as Provider[]) {
    availabilityCache[key] = null;
  }
}

// ── OpenAI-Compatible Client Pool ──────────────────────

const openaiClients: Record<string, OpenAI> = {};

function getOpenAIClient(config: ProviderConfig): OpenAI {
  const key = config.name;
  if (!openaiClients[key]) {
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
    if (!apiKey) throw new Error(`${config.apiKeyEnv} not configured`);
    openaiClients[key] = new OpenAI({
      baseURL: config.baseUrl,
      apiKey,
      ...(config.name === "openrouter"
        ? {
            defaultHeaders: {
              "HTTP-Referer": "https://barbieverse.org",
              "X-Title": "BarbieVerse AI",
            },
          }
        : {}),
    });
  }
  return openaiClients[key];
}

// ── Gemini Client Pool ─────────────────────────────────

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// ── Ollama HTTP Client ─────────────────────────────────

const OLLAMA_TIMEOUT_MS = 30_000;
const OLLAMA_MAX_RETRIES = 2;
const OLLAMA_FALLBACK_MODELS = ["qwen3:8b", "qwen3:4b", "qwen2.5:7b", "qwen2.5:3b", "phi4-mini"];

let ollamaCachedModel: string | null = null;

async function ollamaPost(endpoint: string, body: any): Promise<any> {
  let lastError: Error | null = null;
  const baseUrl = PROVIDER_REGISTRY.ollama.baseUrl;

  for (let attempt = 0; attempt <= OLLAMA_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (err: any) {
      lastError = err;
      if (attempt < OLLAMA_MAX_RETRIES && (err.name === "AbortError" || err.message?.includes("fetch"))) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function getOllamaBestModel(): Promise<string> {
  if (ollamaCachedModel) return ollamaCachedModel;

  try {
    const response = await ollamaPost("/api/tags", {});
    const available: string[] = response.models?.map((m: any) => m.name) || [];

    for (const fallback of OLLAMA_FALLBACK_MODELS) {
      const found = available.find((m) => m.startsWith(fallback));
      if (found) {
        ollamaCachedModel = found;
        return found;
      }
    }

    if (available.length > 0) {
      ollamaCachedModel = available[0];
      return available[0];
    }
  } catch {
    // Ollama not available
  }

  return "phi4-mini";
}

export async function ollamaIsAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const baseUrl = PROVIDER_REGISTRY.ollama.baseUrl;
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export async function ollamaModelInfo(): Promise<{ available: string[]; active: string } | null> {
  try {
    const response = await ollamaPost("/api/tags", {});
    const models = response.models?.map((m: any) => m.name) || [];
    const active = await getOllamaBestModel();
    return { available: models, active };
  } catch {
    return null;
  }
}

// ── Unified Chat Function ──────────────────────────────

async function chatGemini(prompt: string, opts: ChatOptions): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: opts.model || PROVIDER_REGISTRY.gemini.defaultModel,
    systemInstruction: opts.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.7,
    },
  });

  return result.response.text();
}

async function chatGeminiWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  opts: ChatOptions,
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: opts.model || PROVIDER_REGISTRY.gemini.defaultModel,
    systemInstruction: opts.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.3,
    },
  });

  return result.response.text();
}

async function chatOpenAICompatible(
  provider: Provider,
  prompt: string,
  opts: ChatOptions,
): Promise<string> {
  const config = PROVIDER_REGISTRY[provider];
  const client = getOpenAIClient(config);
  const model = opts.model || config.defaultModel;

  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens || 1024,
    temperature: opts.temperature ?? 0.7,
    messages: [
      ...(opts.systemPrompt
        ? [{ role: "system" as const, content: opts.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}

async function chatOpenAICompatibleWithImage(
  provider: Provider,
  prompt: string,
  imageBase64: string,
  mimeType: string,
  opts: ChatOptions,
): Promise<string> {
  const config = PROVIDER_REGISTRY[provider];
  const client = getOpenAIClient(config);
  const model = opts.model || config.defaultModel;

  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens || 1024,
    temperature: opts.temperature ?? 0.3,
    messages: [
      ...(opts.systemPrompt
        ? [{ role: "system" as const, content: opts.systemPrompt }]
        : []),
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return response.choices[0].message.content || "";
}

async function chatAnthropic(
  prompt: string,
  opts: ChatOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model || PROVIDER_REGISTRY.anthropic.defaultModel,
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function chatAnthropicWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  opts: ChatOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model || PROVIDER_REGISTRY.anthropic.defaultModel,
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.3,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function chatOllama(prompt: string, opts: ChatOptions): Promise<string> {
  const model = opts.model || await getOllamaBestModel();

  const response = await ollamaPost("/api/chat", {
    model,
    messages: [
      ...(opts.systemPrompt
        ? [{ role: "system", content: opts.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ],
    options: {
      num_predict: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.7,
    },
    stream: false,
  });

  return response.message?.content || "";
}

// ── Public API ─────────────────────────────────────────

/**
 * Unified chat function — dispatches to the correct provider.
 * Throws if provider is not available (no API key).
 */
export async function chat(
  provider: Provider,
  prompt: string,
  opts: ChatOptions = {},
): Promise<string> {
  if (!isAvailable(provider)) {
    const config = PROVIDER_REGISTRY[provider];
    throw new Error(
      `${provider} not available (${config.apiKeyEnv || "no key"} missing)`,
    );
  }

  switch (provider) {
    case "gemini":
      return chatGemini(prompt, opts);
    case "groq":
    case "mistral":
    case "cerebras":
    case "openrouter":
    case "xai":
      return chatOpenAICompatible(provider, prompt, opts);
    case "anthropic":
      return chatAnthropic(prompt, opts);
    case "ollama":
      return chatOllama(prompt, opts);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Unified chat with image — for vision tasks.
 */
export async function chatWithImage(
  provider: Provider,
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  opts: ChatOptions = {},
): Promise<string> {
  if (!isAvailable(provider)) {
    const config = PROVIDER_REGISTRY[provider];
    throw new Error(
      `${provider} not available (${config.apiKeyEnv || "no key"} missing)`,
    );
  }

  const config = PROVIDER_REGISTRY[provider];
  if (!config.supportsVision) {
    throw new Error(`${provider} does not support vision tasks`);
  }

  switch (provider) {
    case "gemini":
      return chatGeminiWithImage(prompt, imageBase64, mimeType, opts);
    case "openrouter":
      return chatOpenAICompatibleWithImage(provider, prompt, imageBase64, mimeType, opts);
    case "anthropic":
      return chatAnthropicWithImage(prompt, imageBase64, mimeType, opts);
    default:
      throw new Error(`${provider} does not support image input`);
  }
}

/**
 * Unified embedding function — for vector operations.
 */
export async function embed(
  provider: Provider,
  text: string,
): Promise<number[]> {
  if (!isAvailable(provider)) {
    throw new Error(`${provider} not available`);
  }

  const config = PROVIDER_REGISTRY[provider];
  if (!config.supportsEmbeddings) {
    throw new Error(`${provider} does not support embeddings`);
  }

  switch (provider) {
    case "gemini": {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: config.models.embedding || "text-embedding-004",
      });
      const result = await model.embedContent(text);
      return result.embedding.values;
    }
    case "groq":
    case "mistral": {
      const client = getOpenAIClient(config);
      const response = await client.embeddings.create({
        model: config.models.embedding!,
        input: text,
      });
      return response.data[0].embedding;
    }
    case "ollama": {
      const response = await ollamaPost("/api/embeddings", {
        model: config.models.embedding || "nomic-embed-text",
        prompt: text,
      });
      return response.embedding;
    }
    default:
      throw new Error(`${provider} does not support embeddings`);
  }
}

/**
 * Get cost estimate for a provider call (in dollars).
 */
export function estimateCost(
  provider: Provider,
  inputTokens: number,
  outputTokens: number,
): number {
  const config = PROVIDER_REGISTRY[provider];
  return (
    (inputTokens / 1000) * config.costPer1kInput +
    (outputTokens / 1000) * config.costPer1kOutput
  );
}

/**
 * Get the OpenRouter models map (for backward compatibility).
 */
export const OPENROUTER_MODELS = PROVIDER_REGISTRY.openrouter.models;

/**
 * Get the xAI models map (for backward compatibility).
 */
export const XAI_MODELS = PROVIDER_REGISTRY.xai.models;
