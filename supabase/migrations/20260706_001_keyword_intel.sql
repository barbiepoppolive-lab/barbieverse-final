-- Keyword Intelligence: track performance of every search keyword
-- and extract intelligence from discovered posts

-- ── keyword_scores table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keyword_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  pool TEXT NOT NULL DEFAULT 'experimental'
    CHECK (pool IN ('proven', 'ai_discovered', 'experimental')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_generated', 'bio_extracted', 'cross_platform')),

  total_searches INT DEFAULT 0,
  total_results INT DEFAULT 0,
  unique_streamers INT DEFAULT 0,
  hot_leads INT DEFAULT 0,
  warm_leads INT DEFAULT 0,

  last_used_at TIMESTAMPTZ,
  last_new_discovery_at TIMESTAMPTZ,
  score NUMERIC DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(keyword, platform)
);

CREATE INDEX IF NOT EXISTS idx_keyword_scores_pool ON keyword_scores(pool);
CREATE INDEX IF NOT EXISTS idx_keyword_scores_platform ON keyword_scores(platform);
CREATE INDEX IF NOT EXISTS idx_keyword_scores_score ON keyword_scores(score DESC);

-- ── Add extracted intelligence columns to social_leads ──

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_leads' AND column_name = 'extracted_hashtags'
  ) THEN
    ALTER TABLE social_leads ADD COLUMN extracted_hashtags TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_leads' AND column_name = 'extracted_mentions'
  ) THEN
    ALTER TABLE social_leads ADD COLUMN extracted_mentions TEXT[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_leads' AND column_name = 'extracted_niche'
  ) THEN
    ALTER TABLE social_leads ADD COLUMN extracted_niche TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_leads' AND column_name = 'extracted_tier'
  ) THEN
    ALTER TABLE social_leads ADD COLUMN extracted_tier TEXT;
  END IF;
END $$;

-- ── Seed default tiered intervals in settings ────────────

INSERT INTO settings (key, value, category, description) VALUES
  ('scraper_interval_youtube', '0.5', 'scraper', 'YouTube search interval in hours (FREE tier)'),
  ('scraper_interval_reddit', '0.5', 'scraper', 'Reddit search interval in hours (FREE tier)'),
  ('scraper_interval_twitter', '2', 'scraper', 'Twitter search interval in hours (FREE but 1500/month limit)'),
  ('scraper_interval_tiktok', '6', 'scraper', 'TikTok search interval in hours (PAID Apify)'),
  ('scraper_interval_facebook', '12', 'scraper', 'Facebook search interval in hours (PAID Apify)'),
  ('scraper_interval_instagram', '12', 'scraper', 'Instagram search interval in hours (PAID Apify)')
ON CONFLICT (key) DO NOTHING;

-- ── Seed proven keywords from existing admin settings ────

INSERT INTO keyword_scores (keyword, platform, pool, source, score)
SELECT s.value, 'all', 'proven', 'manual', 70
FROM settings s
WHERE s.key = 'scraper_keywords'
  AND s.value IS NOT NULL
  AND s.value != ''
ON CONFLICT (keyword, platform) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────

ALTER TABLE keyword_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can do everything" ON keyword_scores
  FOR ALL USING (auth.role() = 'service_role');

-- ── Updated_at trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_keyword_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS keyword_scores_updated_at ON keyword_scores;
CREATE TRIGGER keyword_scores_updated_at
  BEFORE UPDATE ON keyword_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_scores_updated_at();
