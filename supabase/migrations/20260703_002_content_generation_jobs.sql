-- Content generation jobs table for AI-generated content (carousels, posts, thumbnails, etc.)
CREATE TABLE IF NOT EXISTS content_generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('carousel', 'blog_post', 'social_post', 'thumbnail', 'banner')),
  input_params JSONB NOT NULL DEFAULT '{}',
  output_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating_text', 'generating_images', 'completed', 'failed')),
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_jobs_created_at ON content_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_jobs_type ON content_generation_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_content_jobs_status ON content_generation_jobs(status);
