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
