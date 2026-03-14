
-- Service price intelligence: transparent pricing data
CREATE TABLE public.service_price_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL,
  service_type text NOT NULL,
  device_type text DEFAULT '',
  device_brand text DEFAULT '',
  
  min_price_lkr integer NOT NULL DEFAULT 0,
  max_price_lkr integer NOT NULL DEFAULT 0,
  avg_price_lkr integer,
  currency text DEFAULT 'LKR',
  
  complexity_modifier numeric DEFAULT 1.0,
  location_modifier numeric DEFAULT 1.0,
  
  avg_duration_minutes integer,
  min_duration_minutes integer,
  max_duration_minutes integer,
  
  common_parts jsonb DEFAULT '[]'::jsonb,
  parts_cost_range jsonb DEFAULT '{}'::jsonb,
  
  sample_size integer DEFAULT 0,
  confidence_level text DEFAULT 'rough_estimate',
  price_factors jsonb DEFAULT '[]'::jsonb,
  
  notes text,
  is_active boolean DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(category_code, service_type, device_type, device_brand)
);

ALTER TABLE public.service_price_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price intelligence readable by all" ON public.service_price_intelligence
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage price intelligence" ON public.service_price_intelligence
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_price_intelligence_updated_at
  BEFORE UPDATE ON public.service_price_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
