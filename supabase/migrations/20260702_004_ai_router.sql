-- AI Router — Database tables for usage tracking and memory
-- Run this migration to add AI support to BarbieVerse

-- ============================================
-- AI Usage Logs
-- Tracks every AI API call for cost/usage monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_task_type ON ai_usage_logs(task_type);

-- ============================================
-- AI Memory
-- Short-term and long-term memory for AI modules
-- ============================================
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  embedding vector(384),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for memory queries
CREATE INDEX IF NOT EXISTS idx_ai_memory_module ON ai_memory(module);
CREATE INDEX IF NOT EXISTS idx_ai_memory_key ON ai_memory(key);
CREATE INDEX IF NOT EXISTS idx_ai_memory_expires ON ai_memory(expires_at);

-- ============================================
-- Content Queue (for Content AI module)
-- ============================================
CREATE TABLE IF NOT EXISTS content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  media_url TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending_approval',
  ai_confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled ON content_queue(scheduled_for);

-- ============================================
-- Lead Scores (for Scout AI module)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES creator_leads(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  category TEXT CHECK (category IN ('hot', 'warm', 'cold')),
  reasoning TEXT,
  scored_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_category ON lead_scores(category);
