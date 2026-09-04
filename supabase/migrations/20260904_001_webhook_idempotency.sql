-- ============================================================
-- BarbieVerse Webhook Idempotency Table
-- Date: 2026-09-04
-- Purpose: DB-backed dedup for UPI webhook replays (survives deploys/restarts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_idempotency (
  key         TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.webhook_idempotency TO service_role;
ALTER TABLE public.webhook_idempotency ENABLE ROW LEVEL SECURITY;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_idem_created
  ON public.webhook_idempotency (created_at DESC);

-- Schedule auto-cleanup via pg_cron if available (every 5 minutes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-webhook-idempotency',
      '*/5 * * * *',
      'DELETE FROM public.webhook_idempotency WHERE created_at < now() - INTERVAL ''5 minutes'''
    );
  END IF;
END;
$$;
