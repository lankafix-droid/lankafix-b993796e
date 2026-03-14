
CREATE TABLE public.diagnosis_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  session_id text,
  customer_id uuid,
  category_code text NOT NULL,
  service_type text,
  problem_key text,
  device_brand text,
  device_model text,
  device_type text,
  device_age_years integer,
  device_registry_id uuid REFERENCES public.device_registry(id) ON DELETE SET NULL,
  probable_issue text,
  recommended_service_type text,
  severity_level text DEFAULT 'moderate',
  confidence_score integer DEFAULT 0,
  diagnosis_method text DEFAULT 'symptom_tree',
  estimated_min_price integer,
  estimated_max_price integer,
  price_confidence text DEFAULT 'rough_estimate',
  estimated_duration_minutes integer,
  possible_parts jsonb DEFAULT '[]'::jsonb,
  parts_probability integer,
  estimated_parts_cost_min integer,
  estimated_parts_cost_max integer,
  probabilities jsonb DEFAULT '[]'::jsonb,
  key_findings jsonb DEFAULT '[]'::jsonb,
  self_fix_tips jsonb DEFAULT '[]'::jsonb,
  booking_path text DEFAULT 'direct',
  skipped boolean DEFAULT false,
  technician_actual_issue text,
  technician_diagnosis_accuracy text,
  technician_actual_price integer,
  technician_feedback_at timestamptz,
  diagnosis_duration_seconds integer,
  converted_to_booking boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own diagnosis" ON public.diagnosis_outcomes
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own diagnosis" ON public.diagnosis_outcomes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can manage diagnosis outcomes" ON public.diagnosis_outcomes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can update assigned diagnosis" ON public.diagnosis_outcomes
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN partners p ON p.id = b.partner_id
      WHERE b.id = diagnosis_outcomes.booking_id
      AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_diagnosis_outcomes_updated_at
  BEFORE UPDATE ON public.diagnosis_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
