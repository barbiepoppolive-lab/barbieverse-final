// Usage Tracker — Logs AI usage to Supabase

import type { Provider } from "./providers";

export interface UsageLogEntry {
  provider: Provider;
  task_type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  success: boolean;
  error?: string;
}

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

export async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const pool = await getDb();
    await pool.query(
      `INSERT INTO ai_usage_logs
       (provider, task_type, model, input_tokens, output_tokens, latency_ms, success, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.provider,
        entry.task_type,
        entry.model,
        entry.input_tokens,
        entry.output_tokens,
        entry.latency_ms,
        entry.success,
        entry.error || null,
      ],
    );
  } catch (err) {
    console.error("[UsageTracker] Failed to log:", err);
  }
}

export async function getUsageStats(
  provider?: Provider,
  days: number = 7,
): Promise<any> {
  try {
    const pool = await getDb();

    // Build parameterized query — no string interpolation
    const params: any[] = [days];
    let whereClause = `WHERE created_at >= NOW() - ($1 || ' days')::interval`;

    if (provider) {
      params.push(provider);
      whereClause += ` AND provider = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         provider,
         task_type,
         COUNT(*) as total_requests,
         SUM(input_tokens) as total_input_tokens,
         SUM(output_tokens) as total_output_tokens,
         AVG(latency_ms) as avg_latency_ms,
         SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
       FROM ai_usage_logs
       ${whereClause}
       GROUP BY provider, task_type
       ORDER BY total_requests DESC`,
      params,
    );
    return result.rows;
  } catch (err) {
    console.error("[UsageTracker] Failed to query stats:", err);
    return [];
  }
}
