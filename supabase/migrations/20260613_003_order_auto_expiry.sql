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

-- 2. Add expired_at column (null until auto-expired)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- Index for expiry queries
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON public.orders (expires_at)
  WHERE status IN ('awaiting_payment', 'pending');

-- 3. Set expires_at for existing orders (24h after creation)
UPDATE public.orders
  SET expires_at = created_at + INTERVAL '24 hours'
  WHERE expires_at IS NULL;

-- 4. Function to auto-expire abandoned orders
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

-- 5. Trigger to set expires_at on new orders automatically
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

-- 6. Schedule auto-expiry via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('auto-expire-orders', '*/15 * * * *', 'SELECT auto_expire_orders()');
  END IF;
END;
$$;
