-- Migration: Add Moj platform support
-- Moj is India's leading short-video platform (160M+ MAU, TikTok replacement)

-- Add Moj platform settings
INSERT INTO settings (key, value) VALUES
  ('scraper_enabled_moj', 'true'),
  ('scraper_interval_moj', '12'),
  ('scraper_moj_queries', '')
ON CONFLICT (key) DO NOTHING;
