
CREATE TABLE public.carousel_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_type text NOT NULL,
  title text,
  subtitle text,
  description text,
  image_url text,
  button_text text,
  button_link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.carousel_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_slides TO authenticated;
GRANT ALL ON public.carousel_slides TO service_role;

ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view active slides"
  ON public.carousel_slides FOR SELECT
  USING (is_active = true AND (scheduled_at IS NULL OR scheduled_at <= now()));

CREATE INDEX idx_carousel_slides_type_order ON public.carousel_slides (carousel_type, sort_order);

CREATE TRIGGER set_carousel_slides_updated_at
  BEFORE UPDATE ON public.carousel_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed Carousel 1: Why Barbieverse
INSERT INTO public.carousel_slides (carousel_type, title, subtitle, description, button_text, button_link, sort_order) VALUES
('why_barbieverse','Meet Barbie',$$India's Highest Wealth-Level Poppo Creator$$,'Built through consistency, strategy and audience connection. BarbieVerse gives new creators access to the same ecosystem, support and growth opportunities.','Start Your Journey','/join',1),
('why_barbieverse','Earn From Home','Turn Your Free Time Into Real Income','Go live, connect with viewers and build a rewarding creator journey from your phone.','Learn More','/join',2),
('why_barbieverse','Agency Growth Support',$$You're Not Joining Alone$$,'Our team helps with onboarding, setup, guidance and creator support every step of the way.','Join Agency','/join',3),
('why_barbieverse','₹500 Creator Advantage','Start Strong With ₹500 Creator Credits','New creators joining through BarbieVerse unlock starter creator rewards after successful onboarding.','Claim Advantage','/join',4),
('why_barbieverse','Coin Recharge','Fast Secure Coin Delivery','Recharge through UPI, Net Banking and USDT with order tracking and dedicated support.','Buy Coins','/coins',5);

-- Seed Carousel 2: How Success Happens
INSERT INTO public.carousel_slides (carousel_type, title, description, sort_order) VALUES
('how_success','Create Creator Account','Sign up on Poppo Live with our guided onboarding.',1),
('how_success','Join BarbieVerse Agency','Get verified under our official agency code.',2),
('how_success','Receive Creator Benefits','Unlock starter credits, mentorship and tools.',3),
('how_success','Start Going Live','Connect with viewers and build your audience.',4),
('how_success','Build Wealth Level','Grow gifts, followers and wealth-level milestones.',5),
('how_success','Become A Top Creator','Reach elite tiers with ongoing agency support.',6);

-- Seed Carousel 3: Why Streamers Choose Barbieverse
INSERT INTO public.carousel_slides (carousel_type, title, description, sort_order) VALUES
('why_choose','Built By A Proven Creator',$$Founded by India's highest wealth-level Poppo creator.$$,1),
('why_choose','Real Earning Opportunities','Transparent revenue splits and creator rewards.',2),
('why_choose','Dedicated Human Support','Real humans on WhatsApp, not bots.',3),
('why_choose','Fast Recharge Services','UPI, NetBanking and USDT — coins in 30 minutes.',4),
('why_choose','Luxury VIP Ecosystem','Tiered benefits, priority processing, exclusives.',5);

-- Seed hero/CMS settings keys (only if missing)
INSERT INTO public.settings (key, value) VALUES
('hero_eyebrow','Founder, Barbieverse'),
('hero_name','Barbie'),
('hero_title',$$India's Highest Wealth-Level Poppo Creator$$),
('hero_subtitle','Helping New Creators Start, Grow & Earn From Home'),
('hero_intro','Join the creator ecosystem built by Barbie. Get onboarding support, growth guidance, creator rewards and a premium community designed to help streamers succeed.'),
('hero_signature','— with love, Barbie'),
('hero_cta_primary_text','Start My Creator Journey'),
('hero_cta_primary_link','/join'),
('hero_cta_secondary_text','Explore Earnings'),
('hero_cta_secondary_link','/coins'),
('hero_trust_badges','[{"icon":"🏆","label":"Highest Wealth-Level Creator"},{"icon":"💎","label":"Official Agency Founder"},{"icon":"⚡","label":"Fast Coin Recharge Support"},{"icon":"🌸","label":"Creator Community"}]'),
('vip_tiers','[{"icon":"🌸","name":"Silver Supporter"},{"icon":"✨","name":"Gold Member"},{"icon":"💎","name":"Platinum Elite"},{"icon":"👑","name":"Diamond Circle"},{"icon":"🌌","name":"BarbieVerse Royalty"}]'),
('vip_support_text','Priority Support • Faster Processing • Exclusive Benefits'),
('vip_cta_text','Explore VIP Benefits'),
('homepage_announcement','')
ON CONFLICT (key) DO NOTHING;
