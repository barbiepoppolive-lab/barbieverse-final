// Google Gemini Free API Provider
// Best for: Quality, reasoning, long documents (1M context)
// Limits: 10 RPM, 250 RPD, no credit card required

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface GeminiOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function geminiChat(
  prompt: string,
  opts?: GeminiOptions,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: opts?.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: opts?.maxTokens || 2048,
      temperature: opts?.temperature ?? 0.7,
    },
  });

  return result.response.text();
}

export async function geminiChatWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  opts?: GeminiOptions,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: opts?.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: opts?.maxTokens || 1024,
      temperature: opts?.temperature ?? 0.3,
    },
  });

  return result.response.text();
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "text-embedding-004",
  });

  const result = await model.embedContent(text);
  return result.embedding.values;
}
