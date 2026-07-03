// Ollama Local AI Provider — Direct HTTP (no npm package needed)
// Best for: Fallback, embeddings, offline, privacy
// Limits: Unlimited (local hardware)

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export interface OllamaOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

async function ollamaPost(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`${OLLAMA_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

export async function ollamaChat(
  prompt: string,
  opts?: OllamaOptions,
): Promise<string> {
  const response = await ollamaPost("/api/chat", {
    model: opts?.model || "phi4-mini",
    messages: [
      ...(opts?.systemPrompt
        ? [{ role: "system", content: opts.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ],
    options: {
      num_predict: opts?.maxTokens || 1024,
      temperature: opts?.temperature ?? 0.7,
    },
    stream: false,
  });

  return response.message?.content || "";
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  const response = await ollamaPost("/api/embeddings", {
    model: "nomic-embed-text",
    prompt: text,
  });
  return response.embedding;
}

export async function ollamaIsAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
