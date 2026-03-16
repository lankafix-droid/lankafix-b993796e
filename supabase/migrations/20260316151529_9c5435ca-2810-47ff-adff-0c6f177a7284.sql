
-- AI Events table for explainability, training data, and auditing
CREATE TABLE IF NOT EXISTS public.ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  partner_id uuid,
  booking_id uuid,
  zone_id text,
  category text,
  ai_module text NOT NULL,
  input_summary text,
  output_summary text,
  confidence_score numeric,
  accepted_by_user boolean,
  accepted_by_operator boolean,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- AI Partner Insights table
CREATE TABLE IF NOT EXISTS public.ai_partner_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  insight_type text NOT NULL DEFAULT 'reliability',
  insight_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz
);

-- AI Quality Flags table
CREATE TABLE IF NOT EXISTS public.ai_quality_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid,
  booking_id uuid,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text,
  ai_module text NOT NULL,
  confidence_score numeric,
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Retention Events table
CREATE TABLE IF NOT EXISTS public.ai_retention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  event_type text NOT NULL,
  trigger_reason text,
  nudge_content text,
  channel text DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  clicked_at timestamptz,
  converted_at timestamptz,
  booking_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Experiments table
CREATE TABLE IF NOT EXISTS public.ai_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name text NOT NULL,
  variant text NOT NULL DEFAULT 'control',
  user_id uuid,
  module text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_partner_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_retention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_experiments ENABLE ROW LEVEL SECURITY;

-- AI Events: admins manage, users see own
CREATE POLICY "Admins manage ai_events" ON public.ai_events FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own ai_events" ON public.ai_events FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Authenticated insert ai_events" ON public.ai_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- AI Partner Insights: admins manage
CREATE POLICY "Admins manage ai_partner_insights" ON public.ai_partner_insights FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- AI Quality Flags: admins manage
CREATE POLICY "Admins manage ai_quality_flags" ON public.ai_quality_flags FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- AI Retention Events: admins manage, customers see own
CREATE POLICY "Admins manage ai_retention_events" ON public.ai_retention_events FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers view own retention events" ON public.ai_retention_events FOR SELECT TO public USING (auth.uid() = customer_id);

-- AI Experiments: admins manage
CREATE POLICY "Admins manage ai_experiments" ON public.ai_experiments FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
