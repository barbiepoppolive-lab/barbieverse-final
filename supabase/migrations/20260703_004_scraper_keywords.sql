-- Seed scraper keywords into settings table
-- These will be used by the social monitor

INSERT INTO settings (key, value) VALUES
  ('scraper_keywords', 'poppo live
vone live
poppo host
vone host
live streaming earn money
go live earn
poppo agency
vone agency
live streaming india earn
tiktok streamer
tiktok live
tiktok creator
model streamer
looking for collab
dm for collab
unemployed looking for work
need money
side hustle india
earn from home
live streaming job'),
  ('scraper_reddit_subreddits', 'WorkOnline
beermoney
beermoneyindia
IndianGaming
OnlineMoneyHustles
SideHustle
freelance
WorkFromHome
influencer
TikTokCreators'),
  ('scraper_facebook_queries', 'poppo live
vone live
live streaming earn money
poppo host earn
tiktok streamer
looking for collab
need money work from home'),
  ('scraper_twitter_queries', 'poppo live
vone live
poppo host
live streaming earn india
tiktok streamer
tiktok live
dm for collab
looking for work'),
  ('scraper_youtube_queries', 'poppo live earn money
vone live india
live streaming earn money india
tiktok streamer tips
how to earn from live streaming')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
