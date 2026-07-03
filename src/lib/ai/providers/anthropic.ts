// Anthropic Claude Provider
// Best for: Vision tasks, image analysis
// Limits: Paid API (existing key)

export interface AnthropicOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function anthropicChat(
  prompt: string,
  opts?: AnthropicOptions,
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
      model: opts?.model || "claude-sonnet-4-20250514",
      max_tokens: opts?.maxTokens || 1024,
      temperature: opts?.temperature ?? 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

export async function anthropicVision(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  opts?: AnthropicOptions,
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
      model: opts?.model || "claude-sonnet-4-20250514",
      max_tokens: opts?.maxTokens || 1024,
      temperature: opts?.temperature ?? 0.3,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}
