-- Automation Tables — scrape_schedules, outreach_log
-- Created: 2026-07-02

-- ── Scrape Schedules ───────────────────────────────────
-- Stores recurring scrape job configurations

CREATE TABLE IF NOT EXISTS scrape_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('apify', 'phantombuster')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'youtube', 'telegram')),
  target TEXT NOT NULL DEFAULT 'profiles',
  urls JSONB NOT NULL DEFAULT '[]',
  "limit" INTEGER DEFAULT 20,
  cron_expr TEXT NOT NULL DEFAULT '0 9 * * *',
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Outreach Log ───────────────────────────────────────
-- Tracks outreach attempts and their status

CREATE TABLE IF NOT EXISTS outreach_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id UUID REFERENCES creator_leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'email', 'telegram')),
  message_template TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'replied', 'failed')),
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scrape_schedules_enabled ON scrape_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_scrape_schedules_platform ON scrape_schedules(platform);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead ON outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_status ON outreach_log(status);

-- ── Add enriched_at to leads if not exists ─────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'enriched_at') THEN
    ALTER TABLE leads ADD COLUMN enriched_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'notified_at') THEN
    ALTER TABLE leads ADD COLUMN notified_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── Row Level Security ─────────────────────────────────

ALTER TABLE scrape_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to scrape_schedules" ON scrape_schedules FOR ALL USING (true);
CREATE POLICY "Allow all access to outreach_log" ON outreach_log FOR ALL USING (true);
