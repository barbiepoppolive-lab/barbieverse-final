// OpenRouter Optimizer — Free model discovery, auto-hop, cost tracking, budget management
// Discovers available free models, tests them live, auto-switches on failure,
// tracks costs per task, enforces budget limits, provides real-time dashboard data.

// ── Types ──────────────────────────────────────────────

export interface FreeModel {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  pricing: { prompt: string; completion: string; image: string; request: string };
  architecture: { modality: string; tokenizer: string; instruct_type: string | null };
  top_provider: { max_completion_tokens: number | null; is_moderated: boolean };
  created: number;
  per_request_limits?: any;
}

export interface ModelHealth {
  model: string;
  available: boolean;
  latency_ms: number;
  last_checked: number;
  error?: string;
  success_rate: number; // 0-1
  total_attempts: number;
  total_successes: number;
}

export interface CostEntry {
  id: string;
  timestamp: number;
  model: string;
  task_type: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  success: boolean;
  provider: string;
}

export interface BudgetConfig {
  daily_limit_usd: number;
  monthly_limit_usd: number;
  alert_threshold: number; // 0-1, e.g. 0.8 = alert at 80%
  auto_downgrade: boolean; // auto-switch to free when budget hit
}

export interface OptimizerConfig {
  preferred_free_models: string[];
  fallback_chain: string[];
  max_retries: number;
  health_check_interval_ms: number;
  budget: BudgetConfig;
}

export interface CostDashboard {
  today: { requests: number; cost_usd: number; tokens: number; by_model: Record<string, { requests: number; cost: number }> };
  this_week: { requests: number; cost_usd: number; tokens: number };
  this_month: { requests: number; cost_usd: number; tokens: number };
  budget: { daily_remaining: number; monthly_remaining: number; daily_pct: number; monthly_pct: number };
  health: ModelHealth[];
  active_model: string;
  free_models_available: number;
  total_free_models: number;
  recent_switches: { from: string; to: string; reason: string; timestamp: number }[];
}

// ── Free Model Cache ───────────────────────────────────

let freeModelsCache: FreeModel[] = [];
let freeModelsCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let modelHealthCache: Record<string, ModelHealth> = {};
let costLog: CostEntry[] = [];
let recentSwitches: { from: string; to: string; reason: string; timestamp: number }[] = [];
let activeModel = "meta-llama/llama-3.3-70b-instruct:free";

const DEFAULT_CONFIG: OptimizerConfig = {
  preferred_free_models: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "deepseek/deepseek-r1-0528:free",
    "google/gemini-2.5-flash:free",
    "anthracite/mai-ds-r1:free",
    "moonshotai/kimi-vl-a3b-thinking:free",
    "unsloth/gemma-3-12b-it-bnb-4bit:free",
  ],
  fallback_chain: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "google/gemini-2.5-flash:free",
    "mistralai/mistral-7b-instruct:free",
  ],
  max_retries: 3,
  health_check_interval_ms: 10 * 60 * 1000, // 10 minutes
  budget: {
    daily_limit_usd: 2.0,
    monthly_limit_usd: 60.0,
    alert_threshold: 0.8,
    auto_downgrade: true,
  },
};

// ── Free Model Discovery ───────────────────────────────

/**
 * Fetch all free models from OpenRouter's API.
 * Caches for 5 minutes to avoid hammering the API.
 */
export async function discoverFreeModels(forceRefresh = false): Promise<FreeModel[]> {
  const now = Date.now();
  if (!forceRefresh && freeModelsCache.length > 0 && now - freeModelsCacheTime < CACHE_TTL_MS) {
    return freeModelsCache;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("[OpenRouter-Optimizer] Failed to fetch models:", response.status);
      return freeModelsCache;
    }

    const data = await response.json();
    const allModels = data.data || [];

    // Filter free models (prompt AND completion both "0")
    freeModelsCache = allModels.filter(
      (m: any) =>
        m.pricing?.prompt === "0" &&
        m.pricing?.completion === "0" &&
        !m.id.includes(":extended") &&
        (m.architecture?.modality?.includes("text") || m.architecture?.modality === "text->text")
    );

    freeModelsCacheTime = now;
    console.log(`[OpenRouter-Optimizer] Discovered ${freeModelsCache.length} free models`);
    return freeModelsCache;
  } catch (err) {
    console.error("[OpenRouter-Optimizer] Model discovery failed:", err);
    return freeModelsCache;
  }
}

/**
 * Get free models filtered by capability (code, vision, reasoning, etc.)
 */
export async function getFreeModelsByCapability(
  capability: "code" | "vision" | "reasoning" | "fast" | "balanced" | "creative"
): Promise<FreeModel[]> {
  const allFree = await discoverFreeModels();

  switch (capability) {
    case "code":
      return allFree.filter(
        (m) =>
          m.id.includes("coder") ||
          m.id.includes("code") ||
          m.id.includes("deepseek") ||
          m.name.toLowerCase().includes("code")
      );
    case "vision":
      return allFree.filter(
        (m) =>
          m.architecture?.modality?.includes("image") ||
          m.id.includes("vision") ||
          m.id.includes("vl-")
      );
    case "reasoning":
      return allFree.filter(
        (m) =>
          m.id.includes("r1") ||
          m.id.includes("reason") ||
          m.id.includes("thinking") ||
          m.name.toLowerCase().includes("reason")
      );
    case "fast":
      return allFree
        .filter((m) => m.context_length <= 32000 || m.id.includes("7b") || m.id.includes("8b"))
        .sort((a, b) => (a.context_length || 0) - (b.context_length || 0));
    case "balanced":
      return allFree.filter(
        (m) =>
          m.context_length >= 32000 &&
          (m.id.includes("70b") || m.id.includes("72b") || m.id.includes("large"))
      );
    case "creative":
      return allFree.filter(
        (m) =>
          m.id.includes("creative") ||
          m.id.includes("story") ||
          m.id.includes("instruct")
      );
    default:
      return allFree;
  }
}

// ── Model Health Checking ──────────────────────────────

/**
 * Test if a specific model is available by sending a tiny request.
 */
export async function testModelHealth(modelId: string): Promise<ModelHealth> {
  const startTime = Date.now();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://barbieverse.org",
        "X-Title": "BarbieVerse Health Check",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });

    const latency = Date.now() - startTime;
    const prev = modelHealthCache[modelId];

    if (response.ok) {
      const health: ModelHealth = {
        model: modelId,
        available: true,
        latency_ms: latency,
        last_checked: Date.now(),
        success_rate: prev
          ? (prev.total_successes + 1) / (prev.total_attempts + 1)
          : 1,
        total_attempts: (prev?.total_attempts || 0) + 1,
        total_successes: (prev?.total_successes || 0) + 1,
      };
      modelHealthCache[modelId] = health;
      return health;
    }

    const errText = await response.text();
    const health: ModelHealth = {
      model: modelId,
      available: false,
      latency_ms: latency,
      last_checked: Date.now(),
      error: errText.slice(0, 200),
      success_rate: prev
        ? prev.total_successes / (prev.total_attempts + 1)
        : 0,
      total_attempts: (prev?.total_attempts || 0) + 1,
      total_successes: prev?.total_successes || 0,
    };
    modelHealthCache[modelId] = health;
    return health;
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const prev = modelHealthCache[modelId];
    const health: ModelHealth = {
      model: modelId,
      available: false,
      latency_ms: latency,
      last_checked: Date.now(),
      error: err.message?.slice(0, 200),
      success_rate: prev
        ? prev.total_successes / (prev.total_attempts + 1)
        : 0,
      total_attempts: (prev?.total_attempts || 0) + 1,
      total_successes: prev?.total_successes || 0,
    };
    modelHealthCache[modelId] = health;
    return health;
  }
}

/**
 * Check health of all preferred free models in parallel.
 */
export async function checkAllModelHealth(): Promise<ModelHealth[]> {
  const config = DEFAULT_CONFIG;
  const results = await Promise.allSettled(
    config.preferred_free_models.map((m) => testModelHealth(m))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<ModelHealth>).value);
}

// ── Smart Model Selection ──────────────────────────────

/**
 * Get the best available free model for a given task type.
 * Auto-hops to next model if current is down.
 */
export async function selectBestModel(
  taskType: "chat" | "code" | "content" | "analysis" | "vision" | "reasoning" = "chat"
): Promise<string> {
  const config = DEFAULT_CONFIG;

  // Map task types to model preferences
  const taskModelMap: Record<string, string[]> = {
    chat: config.fallback_chain,
    code: [
      "deepseek/deepseek-chat-v3-0324:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    content: [
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ],
    analysis: [
      "deepseek/deepseek-r1-0528:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    vision: [
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    reasoning: [
      "deepseek/deepseek-r1-0528:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ],
  };

  const candidates = taskModelMap[taskType] || config.fallback_chain;

  // Check budget first
  if (config.budget.auto_downgrade && isBudgetExceeded()) {
    console.log("[OpenRouter-Optimizer] Budget exceeded, forcing free models only");
  }

  // Try each candidate
  for (const model of candidates) {
    const health = modelHealthCache[model];

    // Skip if recently checked and known down
    if (health && !health.available && Date.now() - health.last_checked < 60_000) {
      continue;
    }

    // Skip if success rate is terrible
    if (health && health.total_attempts > 5 && health.success_rate < 0.3) {
      continue;
    }

    // Test if unknown or stale
    if (!health || Date.now() - health.last_checked > DEFAULT_CONFIG.health_check_interval_ms) {
      const testResult = await testModelHealth(model);
      if (testResult.available) {
        if (activeModel !== model) {
          recentSwitches.unshift({
            from: activeModel,
            to: model,
            reason: `Selected for ${taskType}`,
            timestamp: Date.now(),
          });
          if (recentSwitches.length > 20) recentSwitches.pop();
          activeModel = model;
        }
        return model;
      }
    } else if (health.available) {
      if (activeModel !== model) {
        recentSwitches.unshift({
          from: activeModel,
          to: model,
          reason: `Selected for ${taskType}`,
          timestamp: Date.now(),
        });
        if (recentSwitches.length > 20) recentSwitches.pop();
        activeModel = model;
      }
      return model;
    }
  }

  // All candidates failed — try the full free list
  const allFree = await discoverFreeModels();
  for (const model of allFree.slice(0, 5)) {
    const health = await testModelHealth(model.id);
    if (health.available) {
      recentSwitches.unshift({
        from: activeModel,
        to: model.id,
        reason: `Emergency fallback — all preferred models down`,
        timestamp: Date.now(),
      });
      if (recentSwitches.length > 20) recentSwitches.pop();
      activeModel = model.id;
      return model.id;
    }
  }

  // Absolute fallback
  return config.fallback_chain[0];
}

/**
 * Get the current active model without testing.
 */
export function getActiveModel(): string {
  return activeModel;
}

// ── Cost Tracking ──────────────────────────────────────

/**
 * Log a cost entry for a request.
 */
export function logCost(entry: Omit<CostEntry, "id" | "timestamp">): void {
  const fullEntry: CostEntry = {
    ...entry,
    id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  costLog.push(fullEntry);

  // Keep last 10000 entries in memory
  if (costLog.length > 10000) {
    costLog = costLog.slice(-10000);
  }
}

/**
 * Calculate cost for a given model and token count.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // All free models cost $0
  if (model.includes(":free")) return 0;

  // Known paid model pricing (per token)
  const paidPricing: Record<string, { input: number; output: number }> = {
    "anthropic/claude-sonnet-4-20250514": { input: 0.003 / 1000, output: 0.015 / 1000 },
    "openai/gpt-4o": { input: 0.0025 / 1000, output: 0.01 / 1000 },
    "google/gemini-2.5-pro": { input: 0.00125 / 1000, output: 0.005 / 1000 },
  };

  const pricing = paidPricing[model];
  if (!pricing) return 0;

  return inputTokens * pricing.input + outputTokens * pricing.output;
}

// ── Budget Management ──────────────────────────────────

function getTodayCost(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return costLog
    .filter((e) => e.timestamp >= todayStart.getTime())
    .reduce((sum, e) => sum + e.cost_usd, 0);
}

function getMonthCost(): number {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return costLog
    .filter((e) => e.timestamp >= monthStart.getTime())
    .reduce((sum, e) => sum + e.cost_usd, 0);
}

function isBudgetExceeded(): boolean {
  const config = DEFAULT_CONFIG;
  const todayCost = getTodayCost();
  const monthCost = getMonthCost();
  return todayCost >= config.budget.daily_limit_usd || monthCost >= config.budget.monthly_limit_usd;
}

function getBudgetStatus(): CostDashboard["budget"] {
  const config = DEFAULT_CONFIG;
  const todayCost = getTodayCost();
  const monthCost = getMonthCost();
  return {
    daily_remaining: Math.max(0, config.budget.daily_limit_usd - todayCost),
    monthly_remaining: Math.max(0, config.budget.monthly_limit_usd - monthCost),
    daily_pct: Math.min(1, todayCost / config.budget.daily_limit_usd),
    monthly_pct: Math.min(1, monthCost / config.budget.monthly_limit_usd),
  };
}

// ── Dashboard ──────────────────────────────────────────

/**
 * Get full cost dashboard data for the admin UI.
 */
export function getCostDashboard(): CostDashboard {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayEntries = costLog.filter((e) => e.timestamp >= todayStart.getTime());
  const weekEntries = costLog.filter((e) => e.timestamp >= weekStart.getTime());
  const monthEntries = costLog.filter((e) => e.timestamp >= monthStart.getTime());

  function aggregateEntries(entries: CostEntry[]) {
    const byModel: Record<string, { requests: number; cost: number }> = {};
    for (const e of entries) {
      if (!byModel[e.model]) byModel[e.model] = { requests: 0, cost: 0 };
      byModel[e.model].requests++;
      byModel[e.model].cost += e.cost_usd;
    }
    return {
      requests: entries.length,
      cost_usd: entries.reduce((s, e) => s + e.cost_usd, 0),
      tokens: entries.reduce((s, e) => s + e.input_tokens + e.output_tokens, 0),
      by_model: byModel,
    };
  }

  const freeModels = freeModelsCache.filter((m) => m.id.includes(":free"));

  return {
    today: aggregateEntries(todayEntries),
    this_week: aggregateEntries(weekEntries),
    this_month: aggregateEntries(monthEntries),
    budget: getBudgetStatus(),
    health: Object.values(modelHealthCache),
    active_model: activeModel,
    free_models_available: freeModels.length,
    total_free_models: freeModelsCache.length,
    recent_switches: recentSwitches,
  };
}

/**
 * Get cost breakdown by task type.
 */
export function getCostByTaskType(
  days: number = 7
): Record<string, { requests: number; cost: number; tokens: number; avg_latency: number }> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = costLog.filter((e) => e.timestamp >= cutoff);

  const result: Record<string, { requests: number; cost: number; tokens: number; total_latency: number }> = {};

  for (const e of entries) {
    if (!result[e.task_type]) {
      result[e.task_type] = { requests: 0, cost: 0, tokens: 0, total_latency: 0 };
    }
    result[e.task_type].requests++;
    result[e.task_type].cost += e.cost_usd;
    result[e.task_type].tokens += e.input_tokens + e.output_tokens;
    result[e.task_type].total_latency += e.latency_ms;
  }

  // Calculate averages
  const output: Record<string, { requests: number; cost: number; tokens: number; avg_latency: number }> = {};
  for (const [key, val] of Object.entries(result)) {
    output[key] = {
      requests: val.requests,
      cost: val.cost,
      tokens: val.tokens,
      avg_latency: val.total_latency / val.requests,
    };
  }

  return output;
}

// ── Auto-Hop on Failure ────────────────────────────────

/**
 * Called when a model fails mid-request.
 * Automatically switches to next available model and logs the switch.
 */
export async function hopOnFailure(
  failedModel: string,
  taskType: string,
  error: string
): Promise<string> {
  console.log(`[OpenRouter-Optimizer] Model ${failedModel} failed: ${error.slice(0, 100)}`);

  // Mark model as unhealthy
  const prev = modelHealthCache[failedModel];
  modelHealthCache[failedModel] = {
    model: failedModel,
    available: false,
    latency_ms: 0,
    last_checked: Date.now(),
    error: error.slice(0, 200),
    success_rate: prev
      ? prev.total_successes / (prev.total_attempts + 1)
      : 0,
    total_attempts: (prev?.total_attempts || 0) + 1,
    total_successes: prev?.total_successes || 0,
  };

  // Select next best
  const nextModel = await selectBestModel(taskType as any);

  recentSwitches.unshift({
    from: failedModel,
    to: nextModel,
    reason: `Failure: ${error.slice(0, 80)}`,
    timestamp: Date.now(),
  });
  if (recentSwitches.length > 20) recentSwitches.pop();

  console.log(`[OpenRouter-Optimizer] Hopped from ${failedModel} → ${nextModel}`);
  return nextModel;
}

// ── Config Update ──────────────────────────────────────

/**
 * Update optimizer config at runtime.
 */
export function updateOptimizerConfig(updates: Partial<OptimizerConfig>): void {
  if (updates.preferred_free_models) {
    DEFAULT_CONFIG.preferred_free_models = updates.preferred_free_models;
  }
  if (updates.fallback_chain) {
    DEFAULT_CONFIG.fallback_chain = updates.fallback_chain;
  }
  if (updates.budget) {
    Object.assign(DEFAULT_CONFIG.budget, updates.budget);
  }
  if (updates.health_check_interval_ms) {
    DEFAULT_CONFIG.health_check_interval_ms = updates.health_check_interval_ms;
  }
}

/**
 * Get current config.
 */
export function getOptimizerConfig(): OptimizerConfig {
  return { ...DEFAULT_CONFIG };
}

// ── Export cost log for DB persistence ─────────────────

/**
 * Get recent cost entries for persistence.
 */
export function getRecentCosts(limit: number = 100): CostEntry[] {
  return costLog.slice(-limit);
}

/**
 * Clear old cost entries (call periodically).
 */
export function pruneCostLog(olderThanDays: number = 30): number {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const before = costLog.length;
  costLog = costLog.filter((e) => e.timestamp >= cutoff);
  return before - costLog.length;
}
