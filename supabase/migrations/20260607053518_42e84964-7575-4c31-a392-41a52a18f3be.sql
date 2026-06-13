
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
