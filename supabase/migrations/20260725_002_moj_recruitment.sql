-- Moj recruitment pipeline support
--
-- Adds the fields the Moj crawler produces that social_leads had no place
-- for: which segment the creator falls into, how good a recruitment target
-- they look like, and — the important one — whether there's any way to
-- actually reach them. Without contact_channel every Moj lead was a handle
-- with no next action, which is why the Moj funnel produced no signups.

ALTER TABLE public.social_leads
  ADD COLUMN IF NOT EXISTS moj_segment TEXT
    CHECK (moj_segment IS NULL OR moj_segment IN ('live_host', 'short_video_creator', 'earning_content')),
  ADD COLUMN IF NOT EXISTS moj_fit_score INTEGER
    CHECK (moj_fit_score IS NULL OR (moj_fit_score >= 0 AND moj_fit_score <= 100)),
  ADD COLUMN IF NOT EXISTS moj_fit_reason TEXT,
  -- Contact published by the creator themselves in their public Moj bio.
  -- Nothing here is inferred or cross-referenced from other platforms.
  ADD COLUMN IF NOT EXISTS contact_channel TEXT
    CHECK (contact_channel IS NULL OR contact_channel IN ('whatsapp', 'instagram', 'telegram', 'youtube', 'email')),
  ADD COLUMN IF NOT EXISTS contact_value TEXT,
  ADD COLUMN IF NOT EXISTS contact_action_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_confidence REAL,
  -- Set when the creator asks not to be contacted again. Checked before any
  -- outreach so a "stop messaging me" is permanent rather than per-run.
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- Leads with no reachable contact land in 'queued_manual' and are worked
-- by hand inside the Moj app, so they need to be findable as a group.
CREATE INDEX IF NOT EXISTS idx_social_leads_moj_queue
  ON public.social_leads (status, moj_fit_score DESC)
  WHERE platform = 'moj';

CREATE INDEX IF NOT EXISTS idx_social_leads_contactable
  ON public.social_leads (contact_channel, moj_fit_score DESC)
  WHERE contact_channel IS NOT NULL AND opted_out_at IS NULL;

-- ── Seeds ───────────────────────────────────────────────
-- The crawler walks outward from these through Moj's related-video feed, so
-- what you put here determines what it finds. Moj has no keyword search and
-- its homepage is generic entertainment, so seeds are the only steering
-- mechanism that exists.
--
-- REPLACE THESE with real Moj video URLs about live streaming / earning from
-- home. Format: one per line, either a full video URL
-- (https://mojapp.in/@handle/video/123456) or an @handle.
INSERT INTO public.settings (key, value, category, description)
VALUES (
  'scraper_moj_seeds',
  '',
  'scraper',
  'Moj crawl seeds — one video URL or @handle per line. Crawl quality depends entirely on these; seed with videos about live streaming or online earning.'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value, category, description)
VALUES (
  'moj_min_fit_score',
  '35',
  'scraper',
  'Minimum 0-100 fit score for a Moj creator to be stored as a lead.'
)
ON CONFLICT (key) DO NOTHING;

-- ── Instagram creator discovery ─────────────────────────
-- The highest-yield channel: unlike Moj, Instagram has both hashtag search
-- and DMs. Two pools are searched together:
--
--   Poppo/Vone tags — people ALREADY hosting on the exact platform you
--   recruit for. Best leads in the system: no platform change and no new
--   habit to sell, it's purely agency-vs-agency. These tags are also where
--   rival agencies advertise, so the pipeline separates those out rather
--   than pitching them.
--
--   Moj tags — creators comfortable on camera who don't yet stream live.
--   Bigger pool, longer conversion.
--
-- Kept separate from scraper_instagram_hashtags so that tuning the general
-- Instagram monitor doesn't silently retarget this one.
INSERT INTO public.settings (key, value, category, description)
VALUES (
  'creator_instagram_hashtags',
  E'poppolive\npoppo\nvonelive\nvone\npoppoliveindia\npoppohost\nmojstar\nmojindia\nmojapp\nmojlive\nmoj',
  'scraper',
  'Instagram hashtags for creator discovery, one per line. Poppo/Vone tags find existing hosts (highest converting); Moj tags find camera-comfortable creators. Generic #moj is last on purpose — it is a real word in several languages and brings noise.'
)
ON CONFLICT (key) DO NOTHING;

-- Superseded by creator_instagram_hashtags above; still read as a fallback
-- so an install that already tuned this keeps its settings. Safe to delete
-- once you have set the new key.
INSERT INTO public.settings (key, value, category, description)
VALUES (
  'moj_instagram_hashtags',
  '',
  'scraper',
  'DEPRECATED — use creator_instagram_hashtags. Read only as a fallback when the new key is empty.'
)
ON CONFLICT (key) DO NOTHING;

-- Telegram host-group monitoring has no polling config — leads arrive by
-- push through the bot webhook. Recorded here only so the setup step is
-- discoverable from the schema.
INSERT INTO public.settings (key, value, category, description)
VALUES (
  'telegram_group_monitoring_note',
  'Add your bot to host groups, then @BotFather -> /setprivacy -> Disable, or the bot only receives commands and sees no group chatter.',
  'scraper',
  'Setup reminder for Telegram host-group lead monitoring.'
)
ON CONFLICT (key) DO NOTHING;
