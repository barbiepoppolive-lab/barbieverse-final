// Groq Free API Provider
// Best for: Speed (700+ tok/s), real-time chat
// Limits: 30 RPM, 14,400 RPD, no credit card required

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");
    client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey,
    });
  }
  return client;
}

export interface GroqOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export async function groqChat(
  prompt: string,
  opts?: GroqOptions,
): Promise<string> {
  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: opts?.model || "llama-3.3-70b-versatile",
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

export async function groqEmbed(text: string): Promise<number[]> {
  const groq = getClient();
  const response = await groq.embeddings.create({
    model: "nomic-embed-text-v1.5",
    input: text,
  });
  return response.data[0].embedding;
}
