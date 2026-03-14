
-- 1. Add unique constraint to prevent duplicate offers per partner per round
CREATE UNIQUE INDEX idx_dispatch_offers_unique_partner_round
  ON public.dispatch_offers (booking_id, partner_id, dispatch_round)
  WHERE status NOT IN ('expired', 'superseded', 'expired_by_accept');

-- 2. Add 'expired_by_accept' to the status check constraint
-- First drop old constraint, then recreate with new value
ALTER TABLE public.dispatch_offers DROP CONSTRAINT IF EXISTS dispatch_offers_status_check;
ALTER TABLE public.dispatch_offers ADD CONSTRAINT dispatch_offers_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'superseded', 'late_accept', 'expired_by_accept'));
