// OpenRouter API Provider
// Best for: Multi-model access via single API (Claude, GPT-4, Gemini, Llama, Mistral, etc.)
// Uses: OpenAI-compatible API format
// Docs: https://openrouter.ai/docs

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
    client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://barbieverse.org",
        "X-Title": "BarbieVerse AI",
      },
    });
  }
  return client;
}

export interface OpenRouterOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

// Default models for different task types
export const OPENROUTER_MODELS = {
  // Best quality general purpose
  best: "anthropic/claude-sonnet-4-20250514",
  // Fast and cheap for chat
  fast: "meta-llama/llama-3.3-70b-instruct:free",
  // Great for content/creative
  creative: "google/gemini-2.5-flash",
  // Good balance of quality and cost
  balanced: "mistralai/mistral-large-2411",
  // Free models (no cost)
  free: "meta-llama/llama-3.3-70b-instruct:free",
  // Vision capable
  vision: "anthropic/claude-sonnet-4-20250514",
  // Code specialized
  code: "qwen/qwen-2.5-coder-32b-instruct",
  // Reasoning
  reasoning: "google/gemini-2.5-flash",
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODELS;

export async function openrouterChat(
  prompt: string,
  opts?: OpenRouterOptions,
): Promise<string> {
  const openrouter = getClient();
  const response = await openrouter.chat.completions.create({
    model: opts?.model || OPENROUTER_MODELS.fast,
    max_tokens: opts?.maxTokens || 1024,
    temperature: opts?.temperature ?? 0.7,
    messages: [
      ...(opts?.systemPrompt
        ? [{ role: "system" as const, content: opts.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function openrouterChatWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  opts?: OpenRouterOptions,
): Promise<string> {
  const openrouter = getClient();
  const response = await openrouter.chat.completions.create({
    model: opts?.model || OPENROUTER_MODELS.vision,
    max_tokens: opts?.maxTokens || 1024,
    temperature: opts?.temperature ?? 0.3,
    messages: [
      ...(opts?.systemPrompt
        ? [{ role: "system" as const, content: opts.systemPrompt }]
        : []),
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content || "";
}

// List available models (useful for debugging)
export async function openrouterListModels(): Promise<any[]> {
  const openrouter = getClient();
  const response = await openrouter.models.list();
  return response.data;
}
