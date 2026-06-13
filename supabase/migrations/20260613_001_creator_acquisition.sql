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
