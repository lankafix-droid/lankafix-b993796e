
-- =============================================
-- LANKAFIX CORE DATABASE SCHEMA
-- =============================================

-- ========== ENUMS ==========
CREATE TYPE public.partner_verification_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE public.partner_availability AS ENUM ('online', 'offline', 'busy');
CREATE TYPE public.booking_status AS ENUM (
  'requested', 'matching', 'awaiting_partner_confirmation', 'assigned',
  'tech_en_route', 'arrived', 'inspection_started', 'quote_submitted',
  'quote_approved', 'repair_started', 'quality_check', 'invoice_ready',
  'completed', 'cancelled', 'no_show'
);
CREATE TYPE public.quote_status AS ENUM ('draft', 'submitted', 'awaiting_approval', 'approved', 'rejected', 'revision_requested', 'expired');
CREATE TYPE public.pricing_archetype AS ENUM ('fixed_price', 'starting_from', 'diagnostic_first', 'inspection_required');
CREATE TYPE public.service_mode AS ENUM ('on_site', 'drop_off', 'pickup_return', 'express', 'remote');
CREATE TYPE public.payment_status AS ENUM ('pending', 'deposit_paid', 'paid', 'refunded', 'partial_refund');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ========== TIMESTAMP TRIGGER ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  default_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_ts BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========== PARTNERS ==========
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  business_name TEXT,
  phone_number TEXT NOT NULL,
  profile_photo_url TEXT,
  verification_status partner_verification_status NOT NULL DEFAULT 'pending',
  rating_average NUMERIC(3,2) DEFAULT 0,
  completed_jobs_count INTEGER DEFAULT 0,
  categories_supported TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  brand_specializations TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  base_latitude DOUBLE PRECISION,
  base_longitude DOUBLE PRECISION,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  service_zones TEXT[] DEFAULT '{}',
  availability_status partner_availability NOT NULL DEFAULT 'offline',
  emergency_available BOOLEAN DEFAULT false,
  active_job_id UUID,
  strike_count INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER DEFAULT 30,
  vehicle_type TEXT DEFAULT 'motorcycle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners visible to authenticated" ON public.partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Partners can update own record" ON public.partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage partners" ON public.partners FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_partners_availability ON public.partners(availability_status) WHERE verification_status = 'verified';
CREATE INDEX idx_partners_categories ON public.partners USING GIN(categories_supported);
CREATE INDEX idx_partners_zones ON public.partners USING GIN(service_zones);
CREATE TRIGGER update_partners_ts BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== SERVICE ZONES ==========
CREATE TABLE public.service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code TEXT UNIQUE NOT NULL,
  zone_name TEXT NOT NULL,
  zone_group TEXT NOT NULL DEFAULT 'colombo',
  is_active BOOLEAN DEFAULT true,
  travel_fee_lkr INTEGER DEFAULT 0,
  surge_multiplier NUMERIC(3,2) DEFAULT 1.00,
  center_latitude DOUBLE PRECISION,
  center_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zones readable by all" ON public.service_zones FOR SELECT USING (true);
CREATE POLICY "Admins can manage zones" ON public.service_zones FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========== BOOKINGS ==========
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  category_code TEXT NOT NULL,
  service_type TEXT,
  service_mode service_mode DEFAULT 'on_site',
  status booking_status NOT NULL DEFAULT 'requested',
  is_emergency BOOLEAN DEFAULT false,
  pricing_archetype pricing_archetype NOT NULL DEFAULT 'diagnostic_first',
  device_details JSONB DEFAULT '{}',
  diagnostic_answers JSONB DEFAULT '{}',
  diagnostic_summary JSONB DEFAULT '{}',
  customer_latitude DOUBLE PRECISION,
  customer_longitude DOUBLE PRECISION,
  customer_address JSONB DEFAULT '{}',
  zone_code TEXT,
  estimated_price_lkr INTEGER,
  final_price_lkr INTEGER,
  travel_fee_lkr INTEGER DEFAULT 0,
  emergency_surcharge_lkr INTEGER DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  start_otp TEXT,
  completion_otp TEXT,
  scheduled_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  customer_rating INTEGER,
  customer_review TEXT,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Partners can view assigned bookings" ON public.bookings FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Partners can update assigned bookings" ON public.bookings FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_partner ON public.bookings(partner_id);
CREATE TRIGGER update_bookings_ts BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== JOB TIMELINE ==========
CREATE TABLE public.job_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  actor TEXT DEFAULT 'system',
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline visible to booking participants" ON public.job_timeline FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())))
);
CREATE POLICY "Admins can manage timeline" ON public.job_timeline FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_timeline_booking ON public.job_timeline(booking_id);

-- ========== QUOTES ==========
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  status quote_status NOT NULL DEFAULT 'draft',
  service_charge_lkr INTEGER DEFAULT 0,
  labour_lkr INTEGER DEFAULT 0,
  parts JSONB DEFAULT '[]',
  additional_items JSONB DEFAULT '[]',
  total_lkr INTEGER DEFAULT 0,
  warranty_terms TEXT,
  warranty_days INTEGER DEFAULT 30,
  part_grade TEXT,
  estimated_completion TEXT,
  notes TEXT,
  customer_note TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quote visible to booking participants" ON public.quotes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())))
);
CREATE POLICY "Partners can manage own quotes" ON public.quotes FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.partners WHERE id = partner_id));
CREATE POLICY "Admins can manage all quotes" ON public.quotes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_quotes_ts BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== DISPATCH LOG ==========
CREATE TABLE public.dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  score NUMERIC(5,2),
  distance_km NUMERIC(5,2),
  eta_minutes INTEGER,
  status TEXT DEFAULT 'sent',
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view dispatch logs" ON public.dispatch_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage dispatch logs" ON public.dispatch_log FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========== PRICING RULES ==========
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL,
  service_type TEXT NOT NULL,
  archetype pricing_archetype NOT NULL,
  base_price_lkr INTEGER,
  label TEXT NOT NULL,
  description TEXT,
  includes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pricing rules readable by all" ON public.pricing_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage pricing" ON public.pricing_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========== SEED SERVICE ZONES ==========
INSERT INTO public.service_zones (zone_code, zone_name, zone_group, travel_fee_lkr, center_latitude, center_longitude) VALUES
('col_01', 'Colombo 01 - Fort', 'central', 0, 6.9344, 79.8428),
('col_02', 'Colombo 02 - Slave Island', 'central', 0, 6.9271, 79.8540),
('col_03', 'Colombo 03 - Kollupitiya', 'central', 0, 6.9110, 79.8520),
('col_04', 'Colombo 04 - Bambalapitiya', 'central', 0, 6.8945, 79.8575),
('col_05', 'Colombo 05 - Havelock Town', 'central', 0, 6.8780, 79.8610),
('col_06', 'Colombo 06 - Wellawatte', 'central', 0, 6.8720, 79.8600),
('col_07', 'Colombo 07 - Cinnamon Gardens', 'central', 0, 6.9060, 79.8660),
('col_08', 'Colombo 08 - Borella', 'central', 0, 6.9180, 79.8770),
('col_09', 'Colombo 09 - Dematagoda', 'central', 0, 6.9360, 79.8720),
('col_10', 'Colombo 10 - Maradana', 'central', 0, 6.9300, 79.8610),
('col_11', 'Colombo 11 - Pettah', 'central', 0, 6.9400, 79.8520),
('col_12', 'Colombo 12 - Hulftsdorp', 'central', 0, 6.9420, 79.8560),
('col_13', 'Colombo 13 - Kotahena', 'central', 0, 6.9490, 79.8560),
('col_14', 'Colombo 14 - Grandpass', 'central', 0, 6.9520, 79.8650),
('col_15', 'Colombo 15 - Mattakkuliya', 'central', 0, 6.9610, 79.8700),
('nugegoda', 'Nugegoda', 'suburban', 500, 6.8720, 79.8890),
('maharagama', 'Maharagama', 'suburban', 500, 6.8480, 79.9260),
('kotte', 'Sri Jayawardenepura Kotte', 'suburban', 500, 6.8910, 79.9020),
('rajagiriya', 'Rajagiriya', 'suburban', 500, 6.9060, 79.8990),
('battaramulla', 'Battaramulla', 'suburban', 500, 6.9000, 79.9180),
('dehiwala', 'Dehiwala', 'suburban', 500, 6.8510, 79.8640),
('mount_lavinia', 'Mount Lavinia', 'suburban', 500, 6.8380, 79.8640),
('nawala', 'Nawala', 'suburban', 500, 6.8940, 79.8940),
('narahenpita', 'Narahenpita', 'suburban', 500, 6.8870, 79.8730),
('kirulapone', 'Kirulapone', 'suburban', 500, 6.8770, 79.8710),
('malabe', 'Malabe', 'outer', 1000, 6.9020, 79.9550),
('kaduwela', 'Kaduwela', 'outer', 1000, 6.9310, 79.9850),
('piliyandala', 'Piliyandala', 'outer', 1000, 6.7980, 79.9220),
('moratuwa', 'Moratuwa', 'outer', 1000, 6.7730, 79.8810),
('kelaniya', 'Kelaniya', 'outer', 1000, 6.9610, 79.9180),
('wattala', 'Wattala', 'outer', 1000, 6.9810, 79.8920);
