-- Add verified_via column to orders table
-- Tracks which layer captured the UTR (upi_deep_link, screenshot_ocr, whatsapp_share, manual_entry)

-- For Supabase SQL Editor: Run this manually
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_via TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_orders_verified_via ON orders(verified_via) WHERE verified_via IS NOT NULL;
