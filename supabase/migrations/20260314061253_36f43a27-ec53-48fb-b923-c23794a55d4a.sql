
-- Allow customers to view dispatch offers for their own bookings (live tracking)
CREATE POLICY "Customers can view offers for own bookings"
  ON public.dispatch_offers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = dispatch_offers.booking_id 
    AND b.customer_id = auth.uid()
  ));

-- Allow service_role INSERT (edge functions use service role, but explicit for safety)
-- Service role bypasses RLS, so this is mainly for documentation
