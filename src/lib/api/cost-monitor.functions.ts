import { createServerFn } from "@tanstack/react-start";

// ── Cost Dashboard — Live cost monitoring for OpenRouter ──

export const getCostDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const {
      getCostDashboard: getDashboard,
      discoverFreeModels,
      checkAllModelHealth,
      getCostByTaskType,
      getOptimizerConfig,
      getActiveModel,
    } = await import("../ai/openrouter-optimizer");

    // Refresh free model list and health checks
    const freeModels = await discoverFreeModels();
    const health = await checkAllModelHealth();
    const dashboard = getDashboard();
    const taskCosts = getCostByTaskType(7);
    const config = getOptimizerConfig();

    return {
      ...dashboard,
      task_costs: taskCosts,
      config,
      free_models_list: freeModels.slice(0, 20).map((m) => ({
        id: m.id,
        name: m.name,
        context: m.context_length,
        modality: m.architecture?.modality,
      })),
    };
  });

// ── Update Budget Config ──

export const updateBudgetConfig = createServerFn({ method: "POST" })
  .validator(
    (d: any) =>
      d as {
        daily_limit_usd?: number;
        monthly_limit_usd?: number;
        alert_threshold?: number;
        auto_downgrade?: boolean;
      }
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { updateOptimizerConfig } = await import("../ai/openrouter-optimizer");

    updateOptimizerConfig({
      budget: {
        daily_limit_usd: data.daily_limit_usd ?? 2.0,
        monthly_limit_usd: data.monthly_limit_usd ?? 60.0,
        alert_threshold: data.alert_threshold ?? 0.8,
        auto_downgrade: data.auto_downgrade ?? true,
      },
    });

    return { success: true };
  });

// ── Force Refresh Models ──

export const refreshModels = createServerFn({ method: "POST" })
  .handler(async () => {
    const { requireAdmin } = await import("../admin-session.server");
    await requireAdmin();

    const { discoverFreeModels, checkAllModelHealth } = await import("../ai/openrouter-optimizer");

    const models = await discoverFreeModels(true);
    const health = await checkAllModelHealth();

    return {
      free_models: models.length,
      healthy_models: health.filter((h) => h.available).length,
      health,
    };
  });
