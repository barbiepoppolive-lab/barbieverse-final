-- Fix content_generation_jobs CHECK constraint to allow all content types
-- The original only allowed carousel, blog_post, social_post, thumbnail, banner
-- but the code inserts reel_script, story, thread, poll too

ALTER TABLE content_generation_jobs 
  DROP CONSTRAINT IF EXISTS content_generation_jobs_job_type_check;

ALTER TABLE content_generation_jobs 
  ADD CONSTRAINT content_generation_jobs_job_type_check 
  CHECK (job_type IN (
    'carousel', 'reel_script', 'thumbnail', 'story', 'thread', 'poll',
    'blog_post', 'social_post', 'banner'
  ));

-- Add title column for better display in list views
ALTER TABLE content_generation_jobs 
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Add image_urls column for storing generated images
ALTER TABLE content_generation_jobs 
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Add audio_url column for TTS narration
ALTER TABLE content_generation_jobs 
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add music_data column for music recommendations
ALTER TABLE content_generation_jobs 
  ADD COLUMN IF NOT EXISTS music_data JSONB;
