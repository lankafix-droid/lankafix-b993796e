
-- Dispatch Offers table: structured offer tracking with per-offer TTL
CREATE TABLE public.dispatch_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  dispatch_round INTEGER NOT NULL DEFAULT 1,
  offer_mode TEXT NOT NULL DEFAULT 'sequential' CHECK (offer_mode IN ('sequential', 'parallel', 'multi_tech')),
  
  -- Offer payload
  category_code TEXT NOT NULL,
  service_type TEXT,
  customer_zone TEXT,
  estimated_distance_km NUMERIC,
  eta_min_minutes INTEGER,
  eta_max_minutes INTEGER,
  price_estimate_lkr INTEGER,
  is_emergency BOOLEAN DEFAULT false,
  skill_level_required INTEGER DEFAULT 1,
  is_lead_technician BOOLEAN DEFAULT false,
  multi_tech_group_id UUID,
  
  -- Timer
  accept_window_seconds INTEGER NOT NULL DEFAULT 40,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'superseded', 'late_accept')),
  decline_reason TEXT,
  responded_at TIMESTAMPTZ,
  response_time_ms INTEGER,
  
  -- Scoring
  dispatch_score NUMERIC,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_dispatch_offers_booking ON public.dispatch_offers(booking_id);
CREATE INDEX idx_dispatch_offers_partner ON public.dispatch_offers(partner_id);
CREATE INDEX idx_dispatch_offers_status ON public.dispatch_offers(status);
CREATE INDEX idx_dispatch_offers_expires ON public.dispatch_offers(expires_at) WHERE status = 'pending';
CREATE INDEX idx_dispatch_offers_group ON public.dispatch_offers(multi_tech_group_id) WHERE multi_tech_group_id IS NOT NULL;

-- RLS
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all offers"
  ON public.dispatch_offers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own offers"
  ON public.dispatch_offers FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = dispatch_offers.partner_id));

CREATE POLICY "Partners can update own pending offers"
  ON public.dispatch_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = dispatch_offers.partner_id) AND status = 'pending');

-- Enable realtime on dispatch_offers for live customer tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_offers;

-- Also enable realtime on bookings if not already (for dispatch_status changes)
-- This is idempotent - will error silently if already added
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
