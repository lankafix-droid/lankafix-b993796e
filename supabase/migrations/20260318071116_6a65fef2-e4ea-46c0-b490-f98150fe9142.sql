
-- Phase 1: Add is_seeded flag to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_seeded boolean NOT NULL DEFAULT false;

-- Mark all existing partners without user_id as seeded
UPDATE public.partners SET is_seeded = true WHERE user_id IS NULL;

-- Phase 4: Add is_pilot_test flag to bookings table  
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_pilot_test boolean NOT NULL DEFAULT false;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_partners_not_seeded ON public.partners (id) WHERE is_seeded = false;
CREATE INDEX IF NOT EXISTS idx_bookings_pilot_test ON public.bookings (id) WHERE is_pilot_test = true;
