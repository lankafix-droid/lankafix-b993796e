
-- Properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_name TEXT NOT NULL DEFAULT 'My Home',
  property_type TEXT NOT NULL DEFAULT 'house',
  floor_count INTEGER NOT NULL DEFAULT 1,
  approximate_size_sqft INTEGER,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  roof_type TEXT DEFAULT 'concrete',
  health_score INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all properties" ON public.properties FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Property Assets table
CREATE TABLE public.property_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  asset_category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  location_in_property TEXT DEFAULT 'Unspecified',
  estimated_age_years INTEGER,
  status TEXT NOT NULL DEFAULT 'operational',
  confidence_score NUMERIC DEFAULT 0.5,
  last_service_date DATE,
  next_service_due DATE,
  device_passport_id UUID REFERENCES public.device_passports(id),
  notes TEXT,
  detected_via TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.property_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.property_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.property_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.property_assets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all assets" ON public.property_assets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_property_assets_updated_at BEFORE UPDATE ON public.property_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Asset Maintenance Schedule
CREATE TABLE public.asset_maintenance_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.property_assets(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_category TEXT NOT NULL,
  interval_months INTEGER NOT NULL DEFAULT 6,
  last_service_date DATE,
  next_service_due DATE,
  technician_notes TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_maintenance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON public.asset_maintenance_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON public.asset_maintenance_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.asset_maintenance_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all schedules" ON public.asset_maintenance_schedule FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Property Insights
CREATE TABLE public.property_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL DEFAULT 'recommendation',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  category TEXT,
  action_url TEXT,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.property_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.property_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all insights" ON public.property_insights FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
