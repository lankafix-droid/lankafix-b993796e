
-- =============================================
-- 1. CUSTOMER ADDRESSES
-- =============================================
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  landmark TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zone_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own addresses" ON public.customer_addresses
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert own addresses" ON public.customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update own addresses" ON public.customer_addresses
  FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Customers can delete own addresses" ON public.customer_addresses
  FOR DELETE USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage addresses" ON public.customer_addresses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. PARTNER DOCUMENTS
-- =============================================
CREATE TABLE public.partner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own documents" ON public.partner_documents
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Partners can upload own documents" ON public.partner_documents
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Admins can manage documents" ON public.partner_documents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 3. PAYMENTS
-- =============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  amount_lkr INTEGER NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'service',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  paid_by TEXT DEFAULT 'customer',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. PARTNER SETTLEMENTS
-- =============================================
CREATE TABLE public.partner_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  gross_amount_lkr INTEGER NOT NULL DEFAULT 0,
  platform_commission_lkr INTEGER NOT NULL DEFAULT 0,
  net_payout_lkr INTEGER NOT NULL DEFAULT 0,
  settlement_status TEXT NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own settlements" ON public.partner_settlements
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Admins can manage settlements" ON public.partner_settlements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. SUPPORT TICKETS
-- =============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  customer_id UUID REFERENCES auth.users(id),
  partner_id UUID REFERENCES public.partners(id),
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  resolution_type TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Partners can view related tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Admins can manage tickets" ON public.support_tickets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. BOOKING LIFECYCLE HARDENING
-- =============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS assignment_mode TEXT DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS deposit_lkr INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_eta_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS under_mediation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisit_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_otp_expires_at TIMESTAMPTZ;

-- =============================================
-- 7. PARTNER PERFORMANCE HARDENING
-- =============================================
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS max_jobs_per_day INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_job_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_arrival_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_location_ping_at TIMESTAMPTZ;

-- =============================================
-- 8. PARTS CATALOG
-- =============================================
CREATE TABLE public.parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  part_type TEXT NOT NULL,
  part_grade TEXT DEFAULT 'OEM',
  price_lkr INTEGER NOT NULL DEFAULT 0,
  stock_status TEXT DEFAULT 'unknown',
  supplier_name TEXT,
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parts catalog readable by authenticated" ON public.parts_catalog
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage parts catalog" ON public.parts_catalog
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. QUOTE LINE ITEMS
-- =============================================
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'labour',
  label TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  unit_price_lkr INTEGER NOT NULL DEFAULT 0,
  total_price_lkr INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote items visible to quote participants" ON public.quote_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.quotes q
    JOIN public.bookings b ON b.id = q.booking_id
    WHERE q.id = quote_items.quote_id
    AND (b.customer_id = auth.uid() OR q.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  ));
CREATE POLICY "Partners can manage own quote items" ON public.quote_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_items.quote_id
    AND q.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  ));
CREATE POLICY "Admins can manage quote items" ON public.quote_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 10. PLATFORM SETTINGS
-- =============================================
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by authenticated" ON public.platform_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 11. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bookings_zone_status ON public.bookings(zone_code, status);
CREATE INDEX IF NOT EXISTS idx_bookings_category_status ON public.bookings(category_code, status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_booking_status ON public.quotes(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_partner_status ON public.quotes(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_booking ON public.dispatch_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_partner_created ON public.dispatch_log(partner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_zones_group_active ON public.service_zones(zone_group, is_active);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_partner ON public.partner_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_settlements_booking ON public.partner_settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_booking ON public.support_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_category ON public.parts_catalog(category_code);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON public.partner_documents(partner_id);
