
-- Fix overly permissive INSERT policy on eta_predictions
DROP POLICY "Authenticated can insert ETA predictions" ON public.eta_predictions;

CREATE POLICY "Participants can insert ETA predictions"
  ON public.eta_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = eta_predictions.booking_id
      AND (
        b.customer_id = auth.uid()
        OR b.partner_id IN (SELECT p.id FROM partners p WHERE p.user_id = auth.uid())
      )
    )
  );
