// BarbieVerse AI — Public API
// Usage:
//   import { aiRoute, aiChat, aiCode, aiContent, aiVision } from "@/lib/ai";

// Core router
export { aiRoute, aiChat, aiAnalyze, aiCode, aiContent, aiPremium, aiVision } from "./router";
export type { TaskType, AIRouteResult } from "./router";

// Rate limiter
export { isRateLimited, trackUsage, getUsage, getAllUsage, getLimits } from "./rate-limiter";
export type { Provider } from "./rate-limiter";

// Usage tracking
export { logUsage, getUsageStats } from "./usage-tracker";

// Providers (direct access if needed)
export { geminiChat, geminiChatWithImage, geminiEmbed } from "./providers/gemini";
export { groqChat, groqEmbed } from "./providers/groq";
export { mistralChat, mistralEmbed } from "./providers/mistral";
export { cerebrasChat } from "./providers/cerebras";
export { ollamaChat, ollamaEmbed, ollamaIsAvailable } from "./providers/ollama";
export { anthropicChat, anthropicVision } from "./providers/anthropic";
export { openrouterChat, openrouterChatWithImage, openrouterListModels, OPENROUTER_MODELS } from "./providers/openrouter";

// Utilities
export { generateEmbedding, cosineSimilarity, findSimilar } from "./utils/embeddings";
export { PROMPTS } from "./utils/prompts";
