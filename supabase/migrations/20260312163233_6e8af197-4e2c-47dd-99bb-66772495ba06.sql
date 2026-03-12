
-- Fix: Drop old trigger/function if they exist from prior migration
DROP TRIGGER IF EXISTS trg_update_partner_rating ON public.ratings;
DROP FUNCTION IF EXISTS public.update_partner_rating();

-- Recreate function: update rating_average only (no completed_jobs_count)
CREATE OR REPLACE FUNCTION public.update_partner_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_val numeric;
BEGIN
  SELECT avg(rating)::numeric(3,2) INTO avg_val
  FROM public.ratings
  WHERE partner_id = NEW.partner_id;

  UPDATE public.partners
  SET rating_average = avg_val,
      updated_at = now()
  WHERE id = NEW.partner_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_partner_rating
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_partner_rating();

-- Fix RLS: drop old insert policy, add strengthened one
DROP POLICY IF EXISTS "Customers can insert their own ratings" ON public.ratings;

CREATE POLICY "Customers can insert their own ratings" ON public.ratings
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND b.customer_id = auth.uid()
      AND b.partner_id = partner_id
      AND b.status = 'completed'
  )
);

-- Ensure unique constraint for one-rating-per-booking-per-customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_booking_customer_unique'
  ) THEN
    ALTER TABLE public.ratings
    ADD CONSTRAINT ratings_booking_customer_unique UNIQUE (booking_id, customer_id);
  END IF;
END $$;
