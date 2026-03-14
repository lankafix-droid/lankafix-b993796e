
-- Fix overly permissive INSERT policy
DROP POLICY IF EXISTS "Partners can insert evidence" ON public.service_evidence;

CREATE POLICY "Partners can insert evidence"
  ON public.service_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT p.user_id FROM partners p WHERE p.id = service_evidence.partner_id
    )
    OR auth.uid() = service_evidence.customer_id
  );
