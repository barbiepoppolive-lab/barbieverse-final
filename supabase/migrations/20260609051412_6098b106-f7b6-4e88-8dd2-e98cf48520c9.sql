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