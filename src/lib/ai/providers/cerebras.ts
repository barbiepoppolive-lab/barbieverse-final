// Cerebras Free API Provider
// Best for: Highest throughput (2,000 tok/s), batch processing
// Limits: ~1M tokens/day, no credit card required

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) throw new Error("CEREBRAS_API_KEY not configured");
    client = new OpenAI({
      baseURL: "https://api.cerebras.ai/v1",
      apiKey,
    });
  }
  return client;
}

export interface CerebrasOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export async function cerebrasChat(
  prompt: string,
  opts?: CerebrasOptions,
): Promise<string> {
  const cerebras = getClient();
  const response = await cerebras.chat.completions.create({
    model: opts?.model || "llama-3.3-70b",
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
