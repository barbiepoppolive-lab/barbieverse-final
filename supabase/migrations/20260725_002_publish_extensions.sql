-- Extends published_content_log for two additions to the publish pipeline:
-- 1. 'linkedin' — new auto-publish platform (org page, official Posts API,
--    falls back to Telegram manual delivery until Community Management API
--    access is approved — see src/lib/social-publish/linkedin.ts).
-- 2. 'needs_review' — new status. The publish orchestrator runs fully auto
--    with no human approval step, so a quality gate stands in for one:
--    weak drafts get one AI rewrite pass, and if still weak, land here
--    instead of being published or silently skipped.

ALTER TABLE public.published_content_log
  DROP CONSTRAINT IF EXISTS published_content_log_platform_check;
ALTER TABLE public.published_content_log
  ADD CONSTRAINT published_content_log_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'moj', 'youtube', 'linkedin'));

ALTER TABLE public.published_content_log
  DROP CONSTRAINT IF EXISTS published_content_log_status_check;
ALTER TABLE public.published_content_log
  ADD CONSTRAINT published_content_log_status_check
  CHECK (status IN ('published', 'sent_for_manual', 'failed', 'needs_review'));
