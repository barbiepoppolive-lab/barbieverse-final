-- Content Calendar table for AI Brand Manager
-- Stores weekly content plans and scheduling

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'linkedin', 'facebook', 'youtube')),
  content_type TEXT NOT NULL CHECK (content_type IN ('carousel', 'reel_script', 'thumbnail', 'story', 'blog_post', 'social_post', 'thread', 'poll')),
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'failed')),
  content_id UUID REFERENCES content_generation_jobs(id),
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_calendar_date ON content_calendar(date);
CREATE INDEX idx_content_calendar_platform ON content_calendar(platform);
CREATE INDEX idx_content_calendar_status ON content_calendar(status);

-- Add status column to content_generation_jobs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_generation_jobs' AND column_name = 'status'
  ) THEN
    ALTER TABLE content_generation_jobs ADD COLUMN status TEXT DEFAULT 'draft';
  END IF;
END $$;

-- Update existing jobs to have 'completed' status
UPDATE content_generation_jobs SET status = 'completed' WHERE status IS NULL;
