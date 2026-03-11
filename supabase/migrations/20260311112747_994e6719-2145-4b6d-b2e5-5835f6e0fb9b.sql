-- Priority 2: Allow partners to SELECT bookings where they have a pending dispatch_log offer
CREATE POLICY "Partners can view bookings with pending offers"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatch_log dl
      JOIN public.partners p ON p.id = dl.partner_id
      WHERE dl.booking_id = bookings.id
        AND p.user_id = auth.uid()
        AND dl.status IN ('pending_acceptance', 'sent', 'backup')
    )
  );