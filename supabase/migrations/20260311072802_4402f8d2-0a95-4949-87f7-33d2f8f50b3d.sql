
-- Notification events table for internal event tracking
CREATE TABLE public.notification_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id UUID,
  partner_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage notification events"
  ON public.notification_events FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers can view own events
CREATE POLICY "Customers can view own notification events"
  ON public.notification_events FOR SELECT
  TO public
  USING (auth.uid() = customer_id);

-- System inserts (via service role from edge functions or authenticated users for their own)
CREATE POLICY "Authenticated can insert own notification events"
  ON public.notification_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);
