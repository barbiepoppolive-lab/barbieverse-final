// Server-only DB helpers
import { Pool } from "pg";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) environment variable is required");
}

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "development" || process.env.DB_SSL_INSECURE === "true"
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true },
  max: 2,
  idleTimeoutMillis: 5000,
});

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function q1<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
