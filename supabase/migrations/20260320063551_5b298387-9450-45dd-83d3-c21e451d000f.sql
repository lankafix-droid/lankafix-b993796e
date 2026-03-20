
-- =============================================
-- LankaFix SPS — Smart Print Subscription Schema
-- =============================================

-- 1. sps_plans
CREATE TABLE public.sps_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'home',
  best_for TEXT,
  printer_class TEXT NOT NULL DEFAULT 'mono_laser',
  monthly_fee INTEGER NOT NULL DEFAULT 0,
  included_pages INTEGER NOT NULL DEFAULT 500,
  overage_rate NUMERIC(6,2) NOT NULL DEFAULT 3.00,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  setup_fee INTEGER NOT NULL DEFAULT 0,
  support_level TEXT NOT NULL DEFAULT 'standard',
  uptime_priority TEXT NOT NULL DEFAULT 'normal',
  min_term_months INTEGER NOT NULL DEFAULT 6,
  meter_submission_type TEXT NOT NULL DEFAULT 'manual',
  pause_allowed BOOLEAN NOT NULL DEFAULT false,
  is_custom_quote BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  plan_description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.sps_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.sps_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. sps_assets
CREATE TABLE public.sps_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  serial_number TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  asset_category TEXT NOT NULL DEFAULT 'Printer',
  printer_type TEXT NOT NULL DEFAULT 'laser',
  copier_class TEXT,
  mono_or_colour TEXT NOT NULL DEFAULT 'mono',
  functions TEXT[] DEFAULT ARRAY['print']::TEXT[],
  network_capable BOOLEAN NOT NULL DEFAULT false,
  duplex BOOLEAN NOT NULL DEFAULT false,
  max_paper_size TEXT NOT NULL DEFAULT 'A4',
  grade TEXT DEFAULT 'B+',
  cosmetic_grade TEXT DEFAULT 'good',
  smartfix_certified BOOLEAN NOT NULL DEFAULT false,
  refurbishment_status TEXT NOT NULL DEFAULT 'pending',
  sps_eligible BOOLEAN NOT NULL DEFAULT false,
  serviceability_class TEXT NOT NULL DEFAULT 'SPS Eligible',
  review_required BOOLEAN NOT NULL DEFAULT false,
  recommended_segment TEXT,
  monthly_duty_class TEXT DEFAULT 'light',
  acquisition_cost INTEGER DEFAULT 0,
  refurbishment_cost INTEGER DEFAULT 0,
  total_ready_cost INTEGER DEFAULT 0,
  consumable_family TEXT,
  service_risk_grade TEXT DEFAULT 'low',
  page_cost_confidence TEXT DEFAULT 'medium',
  spare_part_confidence TEXT DEFAULT 'medium',
  profitability_status TEXT DEFAULT 'projected',
  recovery_target_months INTEGER DEFAULT 12,
  backup_class TEXT DEFAULT 'standard',
  compatible_plan_ids UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available assets" ON public.sps_assets FOR SELECT USING (true);
CREATE POLICY "Admins can manage assets" ON public.sps_assets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. sps_contracts
CREATE TABLE public.sps_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  plan_id UUID REFERENCES public.sps_plans(id),
  asset_id UUID REFERENCES public.sps_assets(id),
  contract_status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  min_term_months INTEGER NOT NULL DEFAULT 6,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  setup_fee INTEGER NOT NULL DEFAULT 0,
  agreement_accepted BOOLEAN NOT NULL DEFAULT false,
  agreement_version TEXT DEFAULT '1.0',
  refund_terms_acknowledged BOOLEAN NOT NULL DEFAULT false,
  misuse_policy_acknowledged BOOLEAN NOT NULL DEFAULT false,
  billing_cycle_day INTEGER DEFAULT 1,
  pause_status TEXT DEFAULT 'none',
  contract_risk_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contracts" ON public.sps_contracts FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Users can insert own contracts" ON public.sps_contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all contracts" ON public.sps_contracts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. sps_asset_assignments
CREATE TABLE public.sps_asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.sps_assets(id),
  customer_id UUID NOT NULL,
  plan_id UUID REFERENCES public.sps_plans(id),
  contract_id UUID REFERENCES public.sps_contracts(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_at TIMESTAMPTZ,
  assignment_status TEXT NOT NULL DEFAULT 'assigned',
  initial_meter INTEGER DEFAULT 0,
  current_meter INTEGER DEFAULT 0,
  location_id TEXT,
  notes TEXT
);

ALTER TABLE public.sps_asset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assignments" ON public.sps_asset_assignments FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage assignments" ON public.sps_asset_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. sps_meter_readings
CREATE TABLE public.sps_meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.sps_contracts(id),
  asset_id UUID NOT NULL REFERENCES public.sps_assets(id),
  customer_id UUID NOT NULL,
  reading_value INTEGER NOT NULL,
  photo_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'pending',
  anomaly_flag BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE public.sps_meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meter readings" ON public.sps_meter_readings FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Users can submit own meter readings" ON public.sps_meter_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage meter readings" ON public.sps_meter_readings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. sps_support_tickets
CREATE TABLE public.sps_support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.sps_contracts(id),
  asset_id UUID REFERENCES public.sps_assets(id),
  customer_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'general_issue',
  priority TEXT NOT NULL DEFAULT 'normal',
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  sla_band TEXT DEFAULT 'standard',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

ALTER TABLE public.sps_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.sps_support_tickets FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Users can create own tickets" ON public.sps_support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all tickets" ON public.sps_support_tickets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. sps_billing_cycles
CREATE TABLE public.sps_billing_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.sps_contracts(id),
  billing_month TEXT NOT NULL,
  base_fee INTEGER NOT NULL DEFAULT 0,
  included_pages INTEGER NOT NULL DEFAULT 0,
  actual_pages INTEGER NOT NULL DEFAULT 0,
  overage_pages INTEGER NOT NULL DEFAULT 0,
  overage_amount INTEGER NOT NULL DEFAULT 0,
  setup_fee_component INTEGER NOT NULL DEFAULT 0,
  deposit_component INTEGER NOT NULL DEFAULT 0,
  total_due INTEGER NOT NULL DEFAULT 0,
  billing_status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_reference TEXT
);

ALTER TABLE public.sps_billing_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own billing" ON public.sps_billing_cycles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sps_contracts c WHERE c.id = contract_id AND c.customer_id = auth.uid())
);
CREATE POLICY "Admins can manage billing" ON public.sps_billing_cycles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. sps_subscription_requests
CREATE TABLE public.sps_subscription_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  submitted_plan_id UUID REFERENCES public.sps_plans(id),
  requested_segment TEXT,
  monthly_usage_band TEXT,
  mono_or_colour TEXT DEFAULT 'mono',
  multifunction_required BOOLEAN DEFAULT false,
  seasonal_usage BOOLEAN DEFAULT false,
  location TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  nic_or_company TEXT,
  preferred_install_date DATE,
  billing_preference TEXT DEFAULT 'monthly',
  notes TEXT,
  request_status TEXT NOT NULL DEFAULT 'submitted',
  fit_confidence TEXT DEFAULT 'recommended',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_subscription_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON public.sps_subscription_requests FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Users can submit requests" ON public.sps_subscription_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all requests" ON public.sps_subscription_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. sps_plan_recommendations
CREATE TABLE public.sps_plan_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  session_id TEXT,
  recommended_plan_id UUID REFERENCES public.sps_plans(id),
  recommendation_inputs JSONB DEFAULT '{}'::jsonb,
  recommendation_reason TEXT,
  fit_confidence TEXT DEFAULT 'recommended',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_plan_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create recommendations" ON public.sps_plan_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own recommendations" ON public.sps_plan_recommendations FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Admins can view all recommendations" ON public.sps_plan_recommendations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 10. sps_profitability_snapshots
CREATE TABLE public.sps_profitability_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.sps_assets(id),
  contract_id UUID REFERENCES public.sps_contracts(id),
  snapshot_month TEXT NOT NULL,
  revenue_collected INTEGER DEFAULT 0,
  support_cost INTEGER DEFAULT 0,
  consumable_cost INTEGER DEFAULT 0,
  repair_cost INTEGER DEFAULT 0,
  profit_estimate INTEGER DEFAULT 0,
  payback_progress NUMERIC(5,2) DEFAULT 0,
  risk_flag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sps_profitability_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage profitability" ON public.sps_profitability_snapshots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_sps_plans_updated_at BEFORE UPDATE ON public.sps_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sps_assets_updated_at BEFORE UPDATE ON public.sps_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sps_contracts_updated_at BEFORE UPDATE ON public.sps_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
