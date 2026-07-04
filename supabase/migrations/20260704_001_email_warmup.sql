-- Email warmup: track daily sends, enforce limits
CREATE TABLE IF NOT EXISTS email_send_log (
  id          BIGSERIAL PRIMARY KEY,
  recipient   TEXT NOT NULL,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',  -- sent | queued | skipped
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_date ON email_send_log (created_at);

-- Warmup settings (seed defaults)
INSERT INTO settings (key, value) VALUES
  ('email_daily_limit', '10'),
  ('email_warmup_start', '10'),
  ('email_warmup_daily_increase', '5'),
  ('email_warmup_max', '100'),
  ('email_warmup_started_at', now()::text)
ON CONFLICT (key) DO NOTHING;
