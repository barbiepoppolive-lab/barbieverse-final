// Server-only DB helpers
import { Pool, types } from "pg";

// Force PostgreSQL `numeric` (OID 1700) to return as JS numbers instead of strings
types.setTypeParser(1700, (val: string) => parseFloat(val));

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) environment variable is required");
}

// SSL: use Supabase CA cert if provided, otherwise allow unauthorized
// (required for Supabase pooler connections that use self-signed certs).
// For production, set SUPABASE_DB_CA_CERT env var to the CA cert PEM.
const sslConfig = process.env.SUPABASE_DB_CA_CERT
  ? { rejectUnauthorized: true, ca: process.env.SUPABASE_DB_CA_CERT }
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
});

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function q1<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
