
-- ─── Chat messages table with contact masking support ───
CREATE TABLE public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'customer',
  content text NOT NULL,
  original_content text,
  was_masked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage messages" ON public.booking_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Booking participants can view messages" ON public.booking_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_messages.booking_id
    AND (b.customer_id = auth.uid() OR b.partner_id IN (
      SELECT p.id FROM partners p WHERE p.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Booking participants can send messages" ON public.booking_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_messages.booking_id
    AND (b.customer_id = auth.uid() OR b.partner_id IN (
      SELECT p.id FROM partners p WHERE p.user_id = auth.uid()
    ))
  ));

-- ─── Bypass attempt tracking ───
CREATE TABLE public.bypass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL DEFAULT 'customer',
  attempt_type text NOT NULL DEFAULT 'contact_share',
  detected_content text,
  action_taken text DEFAULT 'masked',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bypass_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bypass attempts" ON public.bypass_attempts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── Customer-partner relationship history ───
CREATE TABLE public.service_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  total_bookings integer NOT NULL DEFAULT 0,
  last_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_booking_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, partner_id)
);

ALTER TABLE public.service_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage relationships" ON public.service_relationships FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view own relationships" ON public.service_relationships FOR SELECT
  USING (auth.uid() = customer_id);

-- ─── Loyalty points ledger ───
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'booking_completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty" ON public.loyalty_points FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view own points" ON public.loyalty_points FOR SELECT
  USING (auth.uid() = customer_id);

-- ─── Partner warnings / strikes log ───
CREATE TABLE public.partner_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  warning_type text NOT NULL DEFAULT 'bypass_attempt',
  severity text NOT NULL DEFAULT 'low',
  description text,
  issued_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warnings" ON public.partner_warnings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own warnings" ON public.partner_warnings FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = partner_warnings.partner_id));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
