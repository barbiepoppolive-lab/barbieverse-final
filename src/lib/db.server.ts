// Server-only DB helpers
import { Pool, types } from "pg";

// Force PostgreSQL `numeric` (OID 1700) to return as JS numbers instead of strings
types.setTypeParser(1700, (val: string) => parseFloat(val));

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) environment variable is required");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
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
