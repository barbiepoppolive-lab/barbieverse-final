// BarbieVerse AI — Public API
// Usage:
//   import { aiRoute, aiChat, aiCode, aiContent, aiVision } from "@/lib/ai";

// Core router
export { aiRoute, aiChat, aiAnalyze, aiCode, aiContent, aiPremium, aiVision } from "./router";
export type { TaskType, AIRouteResult } from "./router";

// Rate limiter
export { isRateLimited, trackUsage, getUsage, getAllUsage, getLimits } from "./rate-limiter";

// Usage tracking
export { logUsage, getUsageStats } from "./usage-tracker";

// Unified provider registry
export {
  chat,
  chatWithImage,
  embed,
  isAvailable,
  getAvailableProviders,
  estimateCost,
  PROVIDER_REGISTRY,
  OPENROUTER_MODELS,
  XAI_MODELS,
  ollamaIsAvailable,
  ollamaModelInfo,
} from "./providers";
export type { Provider, ProviderConfig, ChatOptions } from "./providers";

// Image generation (ComfyUI + Pollinations fallback)
export {
  generateImage,
  generateImages,
  getProviderStatus,
  SIZES,
} from "./image-gen";
export type { ImageGenResult, ImageSize } from "./image-gen";

// Audio generation (Edge TTS — free, neural voices)
export {
  generateAudio,
  generateCarouselAudio,
  generateBlogAudio,
  generateSocialAudio,
  generateStoryAudio,
  listVoices,
  cleanupAudioFiles,
} from "./audio-gen";
export type { VoicePreset, AudioGenInput, AudioGenResult, CarouselAudio } from "./audio-gen";

// ComfyUI (direct access if needed)
export {
  isComfyUIAvailable,
  getHealthStatus as getComfyUIHealth,
  listModels as listComfyUIModels,
  getQueueStatus as getComfyUIQueue,
  interrupt as interruptComfyUI,
} from "./comfyui";

// Pollinations (free image generation — direct access)
export { generateImageUrl, downloadImage } from "./providers/pollinations";

// Brand Manager (free content creation)
export {
  generateCarousel,
  generateReelScript,
  generateThumbnail,
  generateStory,
  generateThread,
  generatePoll,
  generateWeeklyPlan,
  generateContentImage,
  generateContentImagePhotorealistic,
  getImageGenStatus,
} from "./modules/brand-manager";
export type {
  ContentPlatform,
  ContentType,
  ContentStatus,
  ContentItem,
  CarouselSlide,
  CarouselWithAudio,
  ReelScript,
  ReelScriptWithAudio,
  ContentCalendarEntry,
  ProviderChoice,
} from "./modules/brand-manager";

// Utilities
export { generateEmbedding, cosineSimilarity, findSimilar } from "./utils/embeddings";
export type { EmbeddingProvider } from "./utils/embeddings";
export { PROMPTS } from "./utils/prompts";
