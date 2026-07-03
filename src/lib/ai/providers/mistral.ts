// Mistral Free API Provider
// Best for: Code generation (Codestral)
// Limits: 2 RPM, 1B tokens/month, no credit card required

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");
    client = new OpenAI({
      baseURL: "https://api.mistral.ai/v1",
      apiKey,
    });
  }
  return client;
}

export interface MistralOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export async function mistralChat(
  prompt: string,
  opts?: MistralOptions,
): Promise<string> {
  const mistral = getClient();
  const response = await mistral.chat.completions.create({
    model: opts?.model || "codestral-latest",
    max_tokens: opts?.maxTokens || 4096,
    temperature: opts?.temperature ?? 0.3,
    messages: [
      ...(opts?.systemPrompt
        ? [{ role: "system" as const, content: opts.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function mistralEmbed(text: string): Promise<number[]> {
  const mistral = getClient();
  const response = await mistral.embeddings.create({
    model: "mistral-embed",
    input: text,
  });
  return response.data[0].embedding;
}
