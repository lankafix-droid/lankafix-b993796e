
-- SPS AI Layer Tables

-- 1. AI Plan Insights
CREATE TABLE IF NOT EXISTS public.sps_ai_plan_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  session_id text,
  recommendation_id text,
  plan_id text NOT NULL,
  insight_summary text NOT NULL,
  fit_strength text,
  tradeoff_summary text,
  watchouts text,
  upgrade_hint text,
  review_required_reason text,
  confidence_score integer DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_plan_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan insights" ON public.sps_ai_plan_insights FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Anon can insert plan insights" ON public.sps_ai_plan_insights FOR INSERT WITH CHECK (true);

-- 2. AI Ticket Triage
CREATE TABLE IF NOT EXISTS public.sps_ai_ticket_triage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  asset_id uuid,
  contract_id uuid,
  probable_issue_type text,
  triage_confidence integer DEFAULT 0,
  urgency_band text DEFAULT 'moderate',
  recommended_action text,
  recommended_support_mode text,
  repeat_issue_flag boolean DEFAULT false,
  replacement_risk_flag boolean DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_ticket_triage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ticket triage" ON public.sps_ai_ticket_triage FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert ticket triage" ON public.sps_ai_ticket_triage FOR INSERT WITH CHECK (true);

-- 3. AI Meter Reviews
CREATE TABLE IF NOT EXISTS public.sps_ai_meter_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_reading_id uuid NOT NULL,
  contract_id uuid,
  asset_id uuid,
  anomaly_score integer DEFAULT 0,
  anomaly_type text,
  explanation text,
  suggested_action text,
  review_status text DEFAULT 'pending',
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_meter_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view meter reviews" ON public.sps_ai_meter_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert meter reviews" ON public.sps_ai_meter_reviews FOR INSERT WITH CHECK (true);

-- 4. AI Advisor Sessions
CREATE TABLE IF NOT EXISTS public.sps_ai_advisor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  session_channel text DEFAULT 'in_app',
  page_context text,
  user_question text NOT NULL,
  ai_response text NOT NULL,
  confidence integer DEFAULT 0,
  escalated_to_human boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_advisor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own advisor sessions" ON public.sps_ai_advisor_sessions FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Anyone can insert advisor sessions" ON public.sps_ai_advisor_sessions FOR INSERT WITH CHECK (true);

-- 5. AI Asset Health Scores (Phase 2 placeholder)
CREATE TABLE IF NOT EXISTS public.sps_ai_asset_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  predicted_breakdown_risk integer DEFAULT 0,
  predicted_service_need text,
  predicted_profitability_risk integer DEFAULT 0,
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_asset_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view asset health" ON public.sps_ai_asset_health_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert asset health" ON public.sps_ai_asset_health_scores FOR INSERT WITH CHECK (true);
