// xAI (Grok) API Provider
// Best for: High-quality reasoning, code, multilingual
// API is OpenAI-compatible at https://api.x.ai/v1

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY not configured");
    client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey,
    });
  }
  return client;
}

export interface XaiOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export const XAI_MODELS = {
  best: "grok-3",           // Best quality
  fast: "grok-3-mini",      // Fast + good quality
  code: "grok-3-mini",      // Code specialist
} as const;

export async function xaiChat(
  prompt: string,
  opts?: XaiOptions,
): Promise<string> {
  const xai = getClient();
  const response = await xai.chat.completions.create({
    model: opts?.model || XAI_MODELS.fast,
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
