
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
