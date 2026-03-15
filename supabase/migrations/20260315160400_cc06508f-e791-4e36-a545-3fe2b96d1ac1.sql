
-- booking_contact_events: lightweight communication activity logging
CREATE TABLE public.booking_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'open_chat',
  user_role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_contact_events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage contact events"
  ON public.booking_contact_events FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Booking participants can insert
CREATE POLICY "Booking participants can insert contact events"
  ON public.booking_contact_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_contact_events.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id IN (SELECT p.id FROM partners p WHERE p.user_id = auth.uid()))
    )
  );

-- Booking participants can view
CREATE POLICY "Booking participants can view contact events"
  ON public.booking_contact_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_contact_events.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id IN (SELECT p.id FROM partners p WHERE p.user_id = auth.uid()))
    )
  );
