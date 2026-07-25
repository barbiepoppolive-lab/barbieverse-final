-- Two acquisition-pipeline bugs found while diagnosing "zero new streamers acquired":
--
-- 1) Instagram/TikTok/Moj never got default search queries seeded (only
--    keywords/reddit/facebook/twitter/youtube were seeded in
--    20260703_004_scraper_keywords.sql). The admin UI has fields for all
--    three, but with nothing in them these platforms searched for nothing
--    and always returned 0 results — indistinguishable from "not finding
--    anything" without reading the code. Seed sensible defaults; feel free
--    to edit them in /admin/scraper.
--
-- 2) 20260706_001_keyword_intel.sql's keyword seed inserted ONE row per
--    platform with platform='all' and keyword = the *entire* newline-joined
--    settings blob (e.g. "poppo live\nvone live\npoppo host\n...") instead of
--    one row per individual keyword. That row can never usefully match a
--    real search, and because it's platform='all' it gets pulled into every
--    platform's candidate list by selectKeywordsForPlatform(). Delete it —
--    the code (src/lib/social-monitor/index.ts resolveKeywords()) now seeds
--    keyword_scores correctly, one row per keyword, the first time a
--    platform's adaptive pool is empty.

INSERT INTO settings (key, value, category, description) VALUES
  ('scraper_instagram_hashtags', 'poppolive
vonelive
livestreamingindia
gharbaithekamao
onlineearningindia', 'scraper', 'Instagram hashtags to search (no default existed before)'),
  ('scraper_tiktok_queries', 'poppo live
vone live
live streaming earn money india
tiktok streamer india', 'scraper', 'TikTok search queries (no default existed before)'),
  ('scraper_moj_queries', 'poppo live
vone live
live streaming se paise kamao
ghar baithe paise kamao', 'scraper', 'Moj search queries (no default existed before)')
ON CONFLICT (key) DO NOTHING;

-- Remove the broken single-blob seed row(s) so they stop polluting every
-- platform's keyword candidate pool.
DELETE FROM keyword_scores
WHERE platform = 'all'
  AND keyword LIKE '%
%'; -- the broken seed's "keyword" contains literal newlines; a real keyword never does
