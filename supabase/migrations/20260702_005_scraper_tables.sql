-- Scraper Tables — scrape_jobs, scrape_results for multi-platform scraping
-- Created: 2026-07-02

-- ── Scrape Jobs ────────────────────────────────────────
-- Tracks every scraping operation across all platforms

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider TEXT NOT NULL CHECK (provider IN ('phantombuster', 'apify', 'csv', 'json')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'youtube', 'telegram')),
  target TEXT NOT NULL CHECK (target IN ('profiles', 'posts', 'reels', 'stories', 'comments', 'followers', 'following', 'hashtags', 'channels', 'videos', 'shorts')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- ── Scrape Results ─────────────────────────────────────
-- Individual scraped items (profiles, posts, etc.)

CREATE TABLE IF NOT EXISTS scrape_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'youtube', 'telegram')),
  item_type TEXT NOT NULL CHECK (item_type IN ('profile', 'post', 'comment', 'video', 'message')),
  username TEXT,
  display_name TEXT,
  bio TEXT,
  followers INTEGER,
  following INTEGER,
  posts_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_business BOOLEAN DEFAULT false,
  email TEXT,
  profile_pic_url TEXT,
  external_url TEXT,
  post_text TEXT,
  likes INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  views_count INTEGER,
  media_url TEXT,
  media_type TEXT,
  hashtags TEXT[],
  item_url TEXT,
  raw_data JSONB DEFAULT '{}',
  imported_to_leads BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_provider ON scrape_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_platform ON scrape_jobs(platform);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON scrape_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_results_job ON scrape_results(job_id);
CREATE INDEX IF NOT EXISTS idx_scrape_results_platform ON scrape_results(platform);
CREATE INDEX IF NOT EXISTS idx_scrape_results_username ON scrape_results(username);
CREATE INDEX IF NOT EXISTS idx_scrape_results_imported ON scrape_results(imported_to_leads);

-- ── Row Level Security ─────────────────────────────────

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to scrape_jobs" ON scrape_jobs FOR ALL USING (true);
CREATE POLICY "Allow all access to scrape_results" ON scrape_results FOR ALL USING (true);
