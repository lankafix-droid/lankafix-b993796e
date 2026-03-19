
-- Leads table: bridges demand_requests → jobs/bookings
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_request_id UUID REFERENCES public.demand_requests(id) ON DELETE SET NULL,
  category_code TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'callback',
  assigned_operator_id TEXT,
  assigned_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  ai_classification JSONB,
  ai_priority_score INTEGER DEFAULT 0,
  ai_suggested_partners JSONB,
  estimated_complexity TEXT DEFAULT 'standard',
  assignment_sent_at TIMESTAMPTZ,
  accept_by TIMESTAMPTZ,
  assignment_attempt INTEGER DEFAULT 0,
  reassigned_from_partner_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_location TEXT,
  description TEXT,
  zone_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_demand_request ON public.leads(demand_request_id);
CREATE INDEX idx_leads_partner ON public.leads(assigned_partner_id);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS: Admin and ops can read/write all leads
CREATE POLICY "Admins can manage leads" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partners can see leads assigned to them
CREATE POLICY "Partners can view assigned leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    assigned_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Public insert for demand conversion
CREATE POLICY "Anyone can create leads" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
