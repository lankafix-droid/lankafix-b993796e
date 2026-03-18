-- ============================================================
-- ATTRIBUTION TABLE SAFETY HARDENING
-- ============================================================
-- PROBLEM: The current permissive INSERT policy (WITH CHECK true) allows
-- any authenticated user to insert arbitrary attribution records,
-- including spoofed revenue values and fake booking linkages.
--
-- SOLUTION: Multi-layered defense:
--   1. Column defaults ensure safe initial values
--   2. Trigger validates booking ownership for linked attributions
--   3. Revenue field defaults to 0 (only system/admin should set real values)
--   4. Attribution type constrained to known values
--
-- WHAT IS USER-WRITABLE vs SYSTEM-DERIVED:
--   User-writable: first_touch_campaign_id, last_touch_campaign_id,
--     assisted_campaign_ids, attribution_type, booking_id
--   System-derived (should only be set by backend functions):
--     attributed_revenue_lkr (defaults to 0, admin-updated post-completion)
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert attributions" ON public.campaign_attributions;

-- Replace with ownership-validated policy
-- Users can only insert attributions linked to their own bookings or with no booking
CREATE POLICY "Users can insert own attributions"
ON public.campaign_attributions
FOR INSERT
TO authenticated
WITH CHECK (
  booking_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = campaign_attributions.booking_id
    AND b.customer_id = auth.uid()
  )
);

-- Validation trigger: constrain attribution_type to known values
-- and ensure revenue cannot be spoofed by regular users
CREATE OR REPLACE FUNCTION public.validate_campaign_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_types text[] := ARRAY['first_touch', 'last_touch', 'assisted', 'linear'];
BEGIN
  -- Validate attribution_type
  IF NOT (NEW.attribution_type = ANY(valid_types)) THEN
    RAISE EXCEPTION 'Invalid attribution_type: %. Must be one of: first_touch, last_touch, assisted, linear', NEW.attribution_type;
  END IF;

  -- Non-admin users cannot set revenue > 0
  -- Revenue is a system-derived field, set by backend after booking completion
  IF NEW.attributed_revenue_lkr > 0 THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.attributed_revenue_lkr := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_validate_campaign_attribution ON public.campaign_attributions;
CREATE TRIGGER trg_validate_campaign_attribution
  BEFORE INSERT ON public.campaign_attributions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_campaign_attribution();