-- Social Leads table — stores AI-monitored social media posts with generated comments
-- Created: 2026-07-03

CREATE TABLE IF NOT EXISTS public.social_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source
  platform TEXT NOT NULL, -- facebook, reddit, twitter, youtube
  post_url TEXT NOT NULL UNIQUE,
  post_text TEXT,
  
  -- Author
  author_name TEXT,
  author_username TEXT,
  author_profile_url TEXT,
  
  -- Context
  keyword_matched TEXT,
  subreddit TEXT,
  group_name TEXT,
  
  -- Engagement
  engagement_score INTEGER DEFAULT 0,
  
  -- AI output
  ai_generated_comment TEXT,
  ai_confidence REAL,
  ai_category TEXT, -- hot, warm, cold
  
  -- Status
  status TEXT DEFAULT 'discovered', -- discovered, ai_reviewed, commented, skipped
  
  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT now(),
  commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_leads_platform ON social_leads(platform);
CREATE INDEX IF NOT EXISTS idx_social_leads_category ON social_leads(ai_category);
CREATE INDEX IF NOT EXISTS idx_social_leads_status ON social_leads(status);
CREATE INDEX IF NOT EXISTS idx_social_leads_discovered ON social_leads(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_leads_url ON social_leads(post_url);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_social_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_leads_updated_at ON social_leads;
CREATE TRIGGER social_leads_updated_at
  BEFORE UPDATE ON social_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_social_leads_updated_at();

-- Row Level Security (admin only via service role)
ALTER TABLE social_leads ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do everything" ON social_leads
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE social_leads IS 'AI-monitored social media posts with pre-generated comments for admin review';
