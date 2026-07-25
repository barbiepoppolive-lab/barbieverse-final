-- Repair social_leads rows whose post_url is a raw CDN media file.
--
-- Two scrapers stored the direct video URL instead of the post page URL:
--
--   Moj    (old parser)  postUrl: videoUrl || <profile>
--   TikTok               postUrl: item.video.playAddr || <constructed>
--
-- A browser downloads a .mp4 rather than rendering it, so "Open" on a lead
-- saved the video to disk instead of loading the post — which made the
-- comment workflow impossible. Every Moj and TikTok lead collected before
-- this migration is affected.
--
-- The CDN paths embed the content id (e.g. `moj_3862292621`), so the real
-- post page can be reconstructed exactly rather than falling back to a
-- profile page and making you hunt for the right video.
--
-- The app also resolves this at render time (src/lib/social-monitor/lead-url.ts),
-- so the UI is already correct without this migration. This cleans the stored
-- data so exports, Telegram messages and anything else reading the column
-- directly are correct too.

-- ── Moj: rebuild .../@handle/video/<id> from moj_<id> in the CDN path ────
UPDATE public.social_leads
SET post_url = 'https://mojapp.in/@' || author_username || '/video/' ||
               (regexp_match(post_url, 'moj_(\d+)'))[1]
WHERE platform = 'moj'
  AND post_url ~ 'moj_\d+'
  AND post_url ~* '\.(mp4|m3u8|webm)(\?|$)|cdn-moj|sharechat\.com'
  AND author_username IS NOT NULL
  AND author_username <> '';

-- ── TikTok: rebuild .../@handle/video/<id> where a long numeric id exists ─
UPDATE public.social_leads
SET post_url = 'https://www.tiktok.com/@' || author_username || '/video/' ||
               (regexp_match(post_url, '(\d{15,})'))[1]
WHERE platform = 'tiktok'
  AND post_url ~ '\d{15,}'
  AND post_url ~* '\.(mp4|m3u8|webm)(\?|$)|tiktokcdn|muscdn'
  AND author_username IS NOT NULL
  AND author_username <> '';

-- ── Anything still pointing at a media file: fall back to the profile ────
-- Less precise than the exact post, but it opens a page you can act on
-- rather than downloading a file.
UPDATE public.social_leads
SET post_url = COALESCE(
      NULLIF(author_profile_url, ''),
      CASE platform
        WHEN 'moj'       THEN 'https://mojapp.in/@' || author_username
        WHEN 'tiktok'    THEN 'https://www.tiktok.com/@' || author_username
        WHEN 'instagram' THEN 'https://instagram.com/' || author_username
        WHEN 'youtube'   THEN 'https://www.youtube.com/@' || author_username
        ELSE post_url
      END
    )
WHERE post_url ~* '\.(mp4|m3u8|mov|webm)(\?|$)'
  AND author_username IS NOT NULL
  AND author_username <> '';

-- How many are left needing attention (should be 0):
--   SELECT platform, count(*) FROM public.social_leads
--    WHERE post_url ~* '\.(mp4|m3u8|mov|webm)(\?|$)' GROUP BY platform;
