// Embedding Utilities — Vector operations for lead dedup, RAG, etc.

import { ollamaEmbed } from "../providers/ollama";
import { geminiEmbed } from "../providers/gemini";
import { mistralEmbed } from "../providers/mistral";

export type EmbeddingProvider = "ollama" | "gemini" | "mistral";

/**
 * Generate embedding vector for text
 * Uses Ollama locally (free) with fallback to cloud
 */
export async function generateEmbedding(
  text: string,
  provider: EmbeddingProvider = "ollama",
): Promise<number[]> {
  try {
    switch (provider) {
      case "ollama":
        return await ollamaEmbed(text);
      case "gemini":
        return await geminiEmbed(text);
      case "mistral":
        return await mistralEmbed(text);
      default:
        return await ollamaEmbed(text);
    }
  } catch (err) {
    // Fallback to next provider
    if (provider === "ollama") {
      return generateEmbedding(text, "gemini");
    }
    if (provider === "gemini") {
      return generateEmbedding(text, "mistral");
    }
    throw err;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar items from a list
 */
export function findSimilar(
  query: number[],
  items: { id: string; embedding: number[] }[],
  threshold: number = 0.85,
  limit: number = 5,
): { id: string; similarity: number }[] {
  const scored = items
    .map((item) => ({
      id: item.id,
      similarity: cosineSimilarity(query, item.embedding),
    }))
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}
