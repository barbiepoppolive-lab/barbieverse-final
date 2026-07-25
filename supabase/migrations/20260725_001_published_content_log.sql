-- Tracks every content-publishing attempt (Facebook/Instagram/YouTube
-- auto-publish, Moj manual-delivery-via-Telegram) so there's a real history
-- instead of only ever seeing it in a Telegram scrollback. Mirrors the
-- email_send_log / scrape_jobs pattern already used elsewhere in this app.

CREATE TABLE IF NOT EXISTS public.published_content_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'moj', 'youtube')),
  topic TEXT,
  caption TEXT NOT NULL,
  hashtags TEXT[],
  image_url TEXT,
  video_url TEXT,
  -- published: actually posted via API (facebook/instagram/youtube)
  -- sent_for_manual: delivered to Telegram for hand upload (moj)
  -- failed: attempted and failed — see `error`
  status TEXT NOT NULL CHECK (status IN ('published', 'sent_for_manual', 'failed')),
  external_post_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_published_content_log_platform ON public.published_content_log (platform, created_at DESC);

ALTER TABLE public.published_content_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can do everything" ON public.published_content_log
  FOR ALL USING (auth.role() = 'service_role');
