// Cost Monitor — Server functions for AI usage & scraping cost dashboard

import { createServerFn } from "@tanstack/react-start";

let dbPool: any = null;

async function getDb() {
  if (!dbPool) {
    const { Pool } = await import("pg");
    dbPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl:
        process.env.DB_SSL_INSECURE === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return dbPool;
}

// ── AI Usage Stats ──────────────────────────────────────

export const aiUsageStats = createServerFn({ method: "GET" })
  .validator((d: { days?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const db = await getDb();
    const days = data.days || 30;

    const [byProvider, byTask, daily, totals] = await Promise.all([
      db.query(
        `SELECT 
           provider,
           COUNT(*) as total_requests,
           SUM(input_tokens) as total_input_tokens,
           SUM(output_tokens) as total_output_tokens,
           AVG(latency_ms)::int as avg_latency_ms,
           SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
           SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
         FROM ai_usage_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY provider
         ORDER BY total_requests DESC`
      ),
      db.query(
        `SELECT 
           task_type,
           COUNT(*) as total_requests,
           SUM(input_tokens + output_tokens) as total_tokens,
           AVG(latency_ms)::int as avg_latency_ms
         FROM ai_usage_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY task_type
         ORDER BY total_requests DESC`
      ),
      db.query(
        `SELECT 
           DATE(created_at) as day,
           COUNT(*) as requests,
           SUM(input_tokens + output_tokens) as tokens,
           SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as errors
         FROM ai_usage_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY day`
      ),
      db.query(
        `SELECT 
           COUNT(*) as total_requests,
           SUM(input_tokens) as total_input_tokens,
           SUM(output_tokens) as total_output_tokens,
           SUM(input_tokens + output_tokens) as total_tokens,
           AVG(latency_ms)::int as avg_latency_ms,
           SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
           SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
         FROM ai_usage_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      ),
    ]);

    return {
      byProvider: byProvider.rows,
      byTask: byTask.rows,
      daily: daily.rows,
      totals: totals.rows[0] || {},
    };
  });

// ── Scraper Cost Stats ──────────────────────────────────

export const scraperCostStats = createServerFn({ method: "GET" })
  .validator((d: { days?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const db = await getDb();
    const days = data.days || 30;

    const [byPlatform, daily, totals] = await Promise.all([
      db.query(
        `SELECT 
           sj.platform,
           COUNT(*) as job_count,
           COALESCE(SUM(sj.cost_usd), 0) as total_cost_usd,
           COALESCE(SUM(sj.result_count), 0) as total_results,
           AVG(sj.cost_usd)::numeric(10,4) as avg_cost_per_job
         FROM scrape_jobs sj
         WHERE sj.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY sj.platform
         ORDER BY total_cost_usd DESC`
      ),
      db.query(
        `SELECT 
           DATE(created_at) as day,
           COUNT(*) as jobs,
           COALESCE(SUM(cost_usd), 0) as cost_usd,
           COALESCE(SUM(result_count), 0) as results
         FROM scrape_jobs
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY day`
      ),
      db.query(
        `SELECT 
           COUNT(*) as total_jobs,
           COALESCE(SUM(cost_usd), 0) as total_cost_usd,
           COALESCE(SUM(result_count), 0) as total_results,
           COALESCE(AVG(cost_usd), 0)::numeric(10,4) as avg_cost_per_job
         FROM scrape_jobs
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      ),
    ]);

    return {
      byPlatform: byPlatform.rows,
      daily: daily.rows,
      totals: totals.rows[0] || {},
    };
  });

// ── Revenue vs Costs (combined view) ────────────────────

export const revenueVsCosts = createServerFn({ method: "GET" })
  .validator((d: { days?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const db = await getDb();
    const days = data.days || 30;

    const [revenue, aiCosts, scrapeCosts] = await Promise.all([
      db.query(
        `SELECT 
           COALESCE(SUM(amount) FILTER (WHERE status IN ('verified','completed')), 0) as revenue,
           COALESCE(SUM(amount) FILTER (WHERE status IN ('verified','completed') AND created_at >= NOW() - INTERVAL '${days} days'), 0) as revenue_period
         FROM orders`
      ),
      db.query(
        `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
         FROM ai_usage_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      ),
      db.query(
        `SELECT COALESCE(SUM(cost_usd), 0) as total_cost_usd
         FROM scrape_jobs
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      ),
    ]);

    return {
      totalRevenue: Number(revenue.rows[0]?.revenue || 0),
      periodRevenue: Number(revenue.rows[0]?.revenue_period || 0),
      aiTokensUsed: Number(aiCosts.rows[0]?.total_tokens || 0),
      scraperCostUsd: Number(scrapeCosts.rows[0]?.total_cost_usd || 0),
    };
  });
