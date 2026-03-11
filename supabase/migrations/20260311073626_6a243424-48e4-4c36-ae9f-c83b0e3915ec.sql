-- Allow authenticated users to insert timeline events for their own bookings
CREATE POLICY "Customers can insert own timeline events"
  ON public.job_timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = job_timeline.booking_id
        AND b.customer_id = auth.uid()
    )
  );