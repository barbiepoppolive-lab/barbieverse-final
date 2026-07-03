-- Video Reels table for AI-generated video content
CREATE TABLE IF NOT EXISTS video_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  script JSONB NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating_voice','generating_visuals','assembling','completed','failed')),
  audio_url TEXT,
  video_clips JSONB DEFAULT '[]',
  final_video_url TEXT,
  duration_seconds INTEGER DEFAULT 30,
  resolution TEXT DEFAULT '1080x1920',
  aspect_ratio TEXT DEFAULT '9:16',
  template TEXT DEFAULT 'marketing',
  voice_id TEXT DEFAULT 'rachel',
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  provider_costs JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_video_reels_created_at ON video_reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_reels_status ON video_reels(status);
