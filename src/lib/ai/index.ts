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

// Audio generation — server-only, import from audio-gen.server.ts directly in API routes

// Music recommendation (AI-powered music selection)
export {
  recommendMusic,
  getContentTypeMusic,
  searchMusic,
  getAllTracks,
  getTracksByMood,
  getTracksByGenre,
  getContentMusicPlan,
} from "./music";
export type {
  MusicTrack,
  MusicRecommendation,
  MusicMood,
  MusicGenre,
  ContentType as MusicContentType,
} from "./music";

// Content SEO & Hashtags (auto-generate for every post)
export {
  generateSEO,
  generateHashtags,
  generateContentSEO,
  formatHashtags,
  getBestPostingTimes,
} from "./content-seo";
export type { SEOData, HashtagSet, ContentSEO, Platform } from "./content-seo";

// Content Quality Engine (AI scoring + improvements)
export {
  scoreContent,
  improveContent,
  generateToneVariations,
  getScoreColor,
  getScoreBg,
  getBadgeLabel,
  getBadgeColor,
} from "./content-quality";
export type { ContentImprovement } from "./content-quality";

// Content Repurposing (one content → multiple formats)
export {
  repurposeContent,
  quickRepurpose,
  getTemplatesByGoal,
  getTemplateById,
  CONTENT_TEMPLATES,
} from "./content-repurpose";
export type { RepurposedContent, ContentTemplate } from "./content-repurpose";

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

// Video Generation (fal.ai + ElevenLabs)
export {
  generateVideo,
  generateVoice,
  generateVideoScript,
  generateFullVideo,
  getVideoGenStatus,
} from "./video-gen";
export type {
  VideoGenInput,
  VideoGenResult,
  VoiceGenInput,
  VoiceGenResult,
  VideoScriptInput,
  VideoScriptResult,
} from "./video-gen";

// OpenRouter Video Generation (Kling, Seedance, Veo, Sora, Wan)
export {
  generateVideoOpenRouter,
  generateVideosOpenRouter,
  generateReelVideo,
  submitVideoJob,
  pollVideoJob,
  estimateVideoCost,
  getModelForBudget,
  getBestModelForUseCase,
  getVideoGenOpenRouterStatus,
  compareVideoCosts,
  VIDEO_MODELS,
} from "./video-gen-openrouter";
export type {
  OpenRouterVideoInput,
  OpenRouterVideoResult,
  VideoModel,
  VideoModelInfo,
  VideoStatus,
} from "./video-gen-openrouter";

// Hook Engine (7 viral hook frameworks with rotation)
export {
  generateHook,
  generateHookVariants,
  getBestFrameworkForPlatform,
  getPlatformHookTips,
  resetRotation,
  getRotationState,
  HOOK_FRAMEWORKS,
} from "./hooks";
export type {
  HookFramework,
  HookPlatform,
  HookInput,
  HookResult,
  HookRotation,
} from "./hooks";

// Quality Reviewer (AI content scoring + auto-revision)
export {
  reviewContent,
  quickQualityCheck,
  reviewVisualQuality,
  autoReviseContent,
} from "./quality-reviewer";
export type {
  QualityCheckInput,
  QualityScore,
  QualityIssue,
} from "./quality-reviewer";

// Visual Director (structured prompts for image/video generation)
export {
  generateVisualPrompt,
  generateVideoVisualPrompt,
  getVisualPreset,
  quickVisualPrompt,
} from "./visual-director";
export type {
  VisualPromptInput,
  VisualPromptResult,
} from "./visual-director";

// Skill System (command-based content creation)
export {
  executeSkill,
  parseSkillCommand,
  isSkillCommand,
  listSkills,
  SKILLS,
} from "./skills";
export type {
  SkillName,
  SkillInput,
  SkillResult,
} from "./skills";

// Media Generation Agent (orchestrates full pipeline)
export {
  generateMedia,
  generateMediaQuick,
} from "./media-agent";
export type {
  MediaAgentInput,
  MediaAgentResult,
  ContentPipeline,
} from "./media-agent";

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

// OpenRouter Optimizer (free model discovery, auto-hop, cost tracking, budget)
export {
  discoverFreeModels,
  getFreeModelsByCapability,
  testModelHealth,
  checkAllModelHealth,
  selectBestModel,
  getActiveModel,
  hopOnFailure,
  logCost,
  calculateCost,
  getCostDashboard,
  getCostByTaskType,
  updateOptimizerConfig,
  getOptimizerConfig,
  getRecentCosts,
  pruneCostLog,
} from "./openrouter-optimizer";
export type {
  FreeModel,
  ModelHealth,
  CostEntry,
  BudgetConfig,
  OptimizerConfig,
  CostDashboard,
} from "./openrouter-optimizer";
