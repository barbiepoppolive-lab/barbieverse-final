-- Fix settings table — add missing category/description columns
-- Created: 2026-07-02

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'category') THEN
    ALTER TABLE public.settings ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'description') THEN
    ALTER TABLE public.settings ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add id column if missing (some migrations create settings without uuid PK)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'id') THEN
    ALTER TABLE public.settings ADD COLUMN id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;
