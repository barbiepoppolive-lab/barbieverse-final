// Ollama Local AI Provider — Direct HTTP (no npm package needed)
// Best for: Fallback, embeddings, offline, privacy
// Limits: Unlimited (local hardware)

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export interface OllamaOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

async function ollamaPost(endpoint: string, body: any): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${OLLAMA_BASE}${endpoint}`, {
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
      if (attempt < MAX_RETRIES && (err.name === "AbortError" || err.message?.includes("fetch"))) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
