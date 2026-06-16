
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, instagram TEXT, email TEXT NOT NULL, whatsapp TEXT NOT NULL,
  city TEXT, follower_count TEXT,
  status TEXT NOT NULL DEFAULT 'new', source TEXT NOT NULL DEFAULT 'direct', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, whatsapp TEXT NOT NULL, poppo_id TEXT NOT NULL,
  package TEXT NOT NULL, coins INT NOT NULL, amount INT NOT NULL, utr TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '',
  excerpt TEXT, category TEXT, featured_image TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read published posts" ON public.posts FOR SELECT USING (published = true);
CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_published ON public.posts(published, created_at DESC);

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.settings (key, value) VALUES
  ('upi_id', 'barbieverse@upi'),
  ('upi_payee_name', 'Barbieverse'),
  ('poppo_signup_link', 'https://poppo.live/signup'),
  ('admin_whatsapp', ''),
  ('interakt_webhook_url', ''),
  ('brevo_sender_email', 'hello@barbieverse.org'),
  ('brevo_sender_name', 'Barbieverse'),
  ('coin_package_1', '{"name":"Starter","coins":100,"price":99}'),
  ('coin_package_2', '{"name":"Popular","coins":500,"price":449}'),
  ('coin_package_3', '{"name":"Value","coins":1000,"price":849}'),
  ('coin_package_4', '{"name":"Mega","coins":5000,"price":3999}'),
  ('usdt_network', 'TRC20'),
  ('usdt_wallet_address', ''),
  ('usdt_inr_rate', '90'),
  ('bank_account_name', 'Barbieverse'),
  ('bank_account_number', ''),
  ('bank_ifsc', ''),
  ('bank_name', ''),
  ('bank_branch', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.posts (title, slug, excerpt, content, category, published) VALUES
('How to Earn ₹500 Joining Bonus on Poppo Live', 'earn-500-bonus-poppo-live', 'Step-by-step guide to claim your instant joining bonus as a new Poppo Live host.', E'# How to Earn ₹500 Joining Bonus on Poppo Live\n\nJoining Poppo Live through Barbieverse gets you an instant ₹500 bonus.\n\n## Step 1: Sign up via our link\n## Step 2: Complete your profile\n## Step 3: Go live for 30 minutes\n\nHappy streaming!', 'Poppo Tips and Tricks', true),
('Top 5 Tips for New Live Streamers in India', 'top-5-tips-new-streamers-india', 'Practical advice to grow your audience on live streaming apps in your first 30 days.', E'# Top 5 Tips\n\n1. Stream consistently\n2. Engage viewers by name\n3. Good lighting\n4. Promote on Instagram\n5. Collaborate', 'Influencer Advice', true),
('Diwali Special: Mega Coin Recharge Offer', 'diwali-mega-coin-offer', 'Get up to 20% extra coins on your Poppo recharge this Diwali season.', E'# Diwali Mega Coin Offer\n\nRecharge through Barbieverse and get bonus coins on every package above ₹449.', 'Coin Offers and Deals', true)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



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



ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expected_amount_paise INTEGER,
  ADD COLUMN IF NOT EXISTS payer_upi TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS action_token TEXT;

ALTER TABLE public.orders ALTER COLUMN utr DROP NOT NULL;

CREATE INDEX IF NOT EXISTS orders_expected_amount_status_idx
  ON public.orders (expected_amount_paise, status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_action_token_idx
  ON public.orders (action_token);

CREATE TABLE IF NOT EXISTS public.unmatched_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount_paise INTEGER NOT NULL,
  utr TEXT,
  payer_upi TEXT,
  raw_payload TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.unmatched_payments TO service_role;
ALTER TABLE public.unmatched_payments ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.creator_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  application_id text NOT NULL UNIQUE,
  mobile_number text NOT NULL,
  whatsapp_number text,
  upi_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('poppo','vone')),
  status text NOT NULL DEFAULT 'Lead Created',
  reward_status text NOT NULL DEFAULT 'Not Eligible',
  lead_source text,
  landing_page text,
  utm_source text,
  utm_campaign text,
  notes text,
  notified_at timestamptz,
  referral_code text
);

CREATE UNIQUE INDEX creator_leads_mobile_unique ON public.creator_leads (mobile_number);
CREATE UNIQUE INDEX creator_leads_upi_unique ON public.creator_leads (lower(upi_id));
CREATE INDEX creator_leads_status_idx ON public.creator_leads (status);
CREATE INDEX creator_leads_created_at_idx ON public.creator_leads (created_at DESC);

GRANT ALL ON public.creator_leads TO service_role;

ALTER TABLE public.creator_leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER creator_leads_set_updated_at
BEFORE UPDATE ON public.creator_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_leads
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_reference text;

-- ============================================================================
-- BarbieVerse Creator Acquisition System - Database Migration
-- ============================================================================
-- Migration Date: 2026-06-11
-- Purpose: Add intent-based segmentation and UGC verification to creator_leads
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to creator_leads table
-- ============================================================================

ALTER TABLE public.creator_leads
  ADD COLUMN IF NOT EXISTS intent text DEFAULT 'reward_only' 
    CHECK (intent IN ('reward_only', 'serious', 'existing', 'curious')),
  ADD COLUMN IF NOT EXISTS ugc_screenshot_url text,
  ADD COLUMN IF NOT EXISTS ugc_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ugc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS segment_priority boolean DEFAULT false;

-- ============================================================================
-- STEP 2: Create indexes for faster queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_creator_leads_intent 
  ON public.creator_leads (intent);

CREATE INDEX IF NOT EXISTS idx_creator_leads_ugc_verified 
  ON public.creator_leads (ugc_verified);

CREATE INDEX IF NOT EXISTS idx_creator_leads_reward_status 
  ON public.creator_leads (reward_status);

CREATE INDEX IF NOT EXISTS idx_creator_leads_intent_status 
  ON public.creator_leads (intent, status);

-- ============================================================================
-- STEP 3: Create settings table for admin-configurable values
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  category text DEFAULT 'general',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "public can read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "only admins can modify settings"
  ON public.settings FOR UPDATE
  USING (false);

-- Permissions
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

-- ============================================================================
-- STEP 4: Insert default configuration values
-- ============================================================================

INSERT INTO public.settings (key, value, category, description) VALUES
  -- Intent Options
  ('creator_intent_option_1_label', 'I want to claim the ₹500 reward only', 'creator_acquisition', 'First intent option label'),
  ('creator_intent_option_1_value', 'reward_only', 'creator_acquisition', 'First intent option value'),
  ('creator_intent_option_2_label', 'I want to start streaming seriously', 'creator_acquisition', 'Second intent option label'),
  ('creator_intent_option_2_value', 'serious', 'creator_acquisition', 'Second intent option value'),
  ('creator_intent_option_3_label', 'I am already streaming, need agency support', 'creator_acquisition', 'Third intent option label'),
  ('creator_intent_option_3_value', 'existing', 'creator_acquisition', 'Third intent option value'),
  ('creator_intent_option_4_label', 'Just curious, exploring options', 'creator_acquisition', 'Fourth intent option label'),
  ('creator_intent_option_4_value', 'curious', 'creator_acquisition', 'Fourth intent option value'),
  
  -- Referral URLs
  ('poppo_referral_url', 'https://poppo.live/register?agency=barbieverse&source=web', 'creator_acquisition', 'Poppo Live referral URL'),
  ('vone_referral_url', 'https://vone.live/register?agency=barbieverse&source=web', 'creator_acquisition', 'Vone Live referral URL'),
  
  -- WhatsApp Messages
  ('whatsapp_msg_signup_reward_only', 'Welcome to BarbieVerse! 🎉

You are all set. Now post an Instagram story showing the app and tag @barbieverse. Once verified, claim your ₹500 reward.

Story link: https://barbieverse.org/verify', 'creator_acquisition', 'WhatsApp message after signup for reward_only intent'),
  
  ('whatsapp_msg_signup_serious', 'Welcome to BarbieVerse! 🚀

You are registered. Now post an Instagram story showing the app and tag @barbieverse. Verify your story to unlock your ₹500 reward.

Start: https://barbieverse.org/verify

Barbie is here to support you 💖', 'creator_acquisition', 'WhatsApp message after signup for serious intent'),
  
  ('whatsapp_msg_signup_existing', 'Welcome to BarbieVerse! 👑

Great to have you on board. We recognize you are an active creator. Post your story on Instagram, tag us, and verify to claim your joining bonus.

Verify: https://barbieverse.org/verify', 'creator_acquisition', 'WhatsApp message after signup for existing intent'),
  
  ('whatsapp_msg_signup_curious', 'Welcome to BarbieVerse! 🌸

Glad you are exploring. Post an Instagram story showing Poppo/Vone and tag @barbieverse. Once verified, you unlock ₹500.

Learn more: https://barbieverse.org', 'creator_acquisition', 'WhatsApp message after signup for curious intent'),
  
  ('whatsapp_msg_verified', 'Your story is verified! ✅

Your ₹500 reward is pending admin approval. We will confirm payment within 24 hours.', 'creator_acquisition', 'WhatsApp message after story verification'),
  
  ('whatsapp_msg_approved', 'Your reward is approved! 🎉

₹500 sent to {upi_id}

Check your UPI in 5-10 minutes. Thank you for joining BarbieVerse 💖', 'creator_acquisition', 'WhatsApp message when reward approved'),
  
  ('whatsapp_msg_rejected', 'We could not verify your story. ❌

Reason: {reason}

Please try again or contact Barbie on WhatsApp for help.', 'creator_acquisition', 'WhatsApp message when story rejected')
  
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- STEP 5: Create audit log table for tracking changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_leads_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_lead_id uuid NOT NULL REFERENCES public.creator_leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_leads_logs_lead_id 
  ON public.creator_leads_logs (creator_lead_id);

CREATE INDEX IF NOT EXISTS idx_creator_leads_logs_created_at 
  ON public.creator_leads_logs (created_at DESC);

-- Permissions
GRANT SELECT ON public.creator_leads_logs TO authenticated;
GRANT ALL ON public.creator_leads_logs TO service_role;

-- RLS
ALTER TABLE public.creator_leads_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read logs"
  ON public.creator_leads_logs FOR SELECT
  USING (true);

-- ============================================================================
-- STEP 6: Create function to log changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_creator_lead_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creator_leads_logs (creator_lead_id, action, old_value, new_value, changed_by)
  VALUES (NEW.id, TG_ARGV[0], row_to_json(OLD), row_to_json(NEW), current_user);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creator_leads_log_changes
  AFTER UPDATE ON public.creator_leads
  FOR EACH ROW
  EXECUTE FUNCTION log_creator_lead_change('update');

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The creator_leads table now supports:
-- ✓ Intent-based segmentation (4 types of creators)
-- ✓ UGC screenshot validation (ugc_verified, ugc_screenshot_url)
-- ✓ Admin-configurable settings (intent options, URLs, messages)
-- ✓ Audit logging (track all changes)
-- ============================================================================


-- ============================================================
-- BarbieVerse Recharge System Fixes
-- Date: 2026-06-13
-- Changes:
--   1. Add admin notes + refund columns to orders
--   2. Add order_status_logs for tracking history
--   3. Add USDT/NetBanking UTR manual-submit support
--   4. Add settings keys for USDT/NetBanking auto-notify
-- ============================================================

-- 1. New columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_notes    text,
  ADD COLUMN IF NOT EXISTS refund_status  text CHECK (refund_status IN ('none','requested','approved','completed')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_at    timestamptz,
  ADD COLUMN IF NOT EXISTS refund_notes   text,
  ADD COLUMN IF NOT EXISTS utr_submitted_at timestamptz;   -- when customer manually submitted UTR

CREATE INDEX IF NOT EXISTS idx_orders_refund_status ON public.orders (refund_status);

-- 2. Order status log (full audit trail)
CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status  text,
  new_status  text NOT NULL,
  changed_by  text NOT NULL DEFAULT 'system',   -- 'system' | 'admin' | 'webhook' | 'customer'
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_logs_order_id  ON public.order_status_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created   ON public.order_status_logs (created_at DESC);

GRANT SELECT ON public.order_status_logs TO authenticated;
GRANT ALL    ON public.order_status_logs TO service_role;

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.order_status_logs FOR SELECT USING (true);

-- 3. Trigger: auto-log every orders status change
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_logs (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, current_user);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_log ON public.orders;
CREATE TRIGGER trg_order_status_log
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- 4. New settings keys for USDT / NetBanking auto-notify
INSERT INTO public.settings (key, value) VALUES
  ('usdt_confirm_msg',    'We have received your USDT payment of {amount} USDT (Order {order_id}). Our team is verifying the transaction. Coins will be credited within 30 minutes.'),
  ('netbank_confirm_msg', 'We have received your Net Banking payment of ₹{amount} (Order {order_id}). Our team is verifying the transfer. Coins will be credited shortly.'),
  ('refund_msg',          'Your refund of ₹{amount} for Order {order_id} has been processed. It will reflect in your original payment account within 3-5 business days.')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- BarbieVerse Order Auto-Expiry & Cleanup
-- Date: 2026-06-13
-- Changes:
--   1. Add expires_at column to orders for auto-expiry
--   2. Add cleanup_sessions function for periodic use
--   3. Add auto-expire trigger for abandoned orders
-- ============================================================

-- 1. Add expires_at column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index for expiry queries
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON public.orders (expires_at)
  WHERE status IN ('awaiting_payment', 'pending');

-- 2. Set expires_at for existing orders (24h after creation)
UPDATE public.orders
  SET expires_at = created_at + INTERVAL '24 hours'
  WHERE expires_at IS NULL;

-- 3. Function to auto-expire abandoned orders
CREATE OR REPLACE FUNCTION public.auto_expire_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.orders
    SET status = 'rejected',
        updated_at = now()
    WHERE status IN ('awaiting_payment', 'pending')
      AND expires_at < now()
      AND expired_at IS NULL;
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;

-- 4. Trigger to set expires_at on new orders automatically
CREATE OR REPLACE FUNCTION public.set_order_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_expiry ON public.orders;
CREATE TRIGGER trg_set_order_expiry
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_expiry();

-- 5. Add expired_at column (null until auto-expired)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- 6. Schedule auto-expiry via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('auto-expire-orders', '*/15 * * * *', 'SELECT auto_expire_orders()');
  END IF;
END;
$$;


