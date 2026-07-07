-- Fix content_generation_jobs CHECK constraint — add media_agent, skill, month_plan, video_script, video

ALTER TABLE content_generation_jobs 
  DROP CONSTRAINT IF EXISTS content_generation_jobs_job_type_check;

ALTER TABLE content_generation_jobs 
  ADD CONSTRAINT content_generation_jobs_job_type_check 
  CHECK (job_type IN (
    'carousel', 'reel_script', 'thumbnail', 'story', 'thread', 'poll',
    'blog_post', 'social_post', 'banner',
    'media_agent', 'skill', 'month_plan', 'video_script', 'video'
  ));
