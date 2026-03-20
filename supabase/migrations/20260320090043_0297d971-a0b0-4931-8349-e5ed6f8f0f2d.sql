
-- ══════════════════════════════════════════════════════════════
-- SPS Intelligence Layer — Extend + Create tables
-- ══════════════════════════════════════════════════════════════

-- 1. Extend sps_ai_asset_health_scores
ALTER TABLE public.sps_ai_asset_health_scores
  ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS support_burden_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_issue_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meter_risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profitability_risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replacement_risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trend_direction text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS top_reasons jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence text DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_sps_asset_health_asset ON public.sps_ai_asset_health_scores(asset_id);
CREATE INDEX IF NOT EXISTS idx_sps_asset_health_date ON public.sps_ai_asset_health_scores(score_date DESC);

-- 2. Predictive Maintenance
CREATE TABLE public.sps_ai_predictive_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL,
  contract_id uuid,
  prediction_date date NOT NULL DEFAULT CURRENT_DATE,
  maintenance_risk_level text NOT NULL DEFAULT 'low',
  predicted_issue_category text,
  confidence text DEFAULT 'medium',
  trend_direction text DEFAULT 'stable',
  contributing_factors jsonb DEFAULT '[]'::jsonb,
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sps_pred_maint_asset ON public.sps_ai_predictive_maintenance(asset_id);
CREATE INDEX idx_sps_pred_maint_risk ON public.sps_ai_predictive_maintenance(maintenance_risk_level);

-- 3. Contract Profitability
CREATE TABLE public.sps_ai_contract_profitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  revenue_collected numeric(12,2) DEFAULT 0,
  support_cost numeric(12,2) DEFAULT 0,
  consumable_cost numeric(12,2) DEFAULT 0,
  repair_cost numeric(12,2) DEFAULT 0,
  overage_revenue numeric(12,2) DEFAULT 0,
  margin_estimate numeric(12,2) DEFAULT 0,
  profitability_status text NOT NULL DEFAULT 'healthy',
  payback_progress numeric(5,2) DEFAULT 0,
  breakeven_estimate_months integer,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sps_profit_contract ON public.sps_ai_contract_profitability(contract_id);
CREATE INDEX idx_sps_profit_status ON public.sps_ai_contract_profitability(profitability_status);

-- 4. Contract Signals
CREATE TABLE public.sps_ai_contract_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  signal_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_signal text DEFAULT 'stable',
  churn_risk text DEFAULT 'low',
  pause_risk text DEFAULT 'low',
  upgrade_opportunity text DEFAULT 'none',
  downgrade_opportunity text DEFAULT 'none',
  usage_fit_score integer DEFAULT 50,
  billing_stability_score integer DEFAULT 50,
  satisfaction_proxy_score integer DEFAULT 50,
  reasons jsonb DEFAULT '[]'::jsonb,
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sps_signals_contract ON public.sps_ai_contract_signals(contract_id);
CREATE INDEX idx_sps_signals_churn ON public.sps_ai_contract_signals(churn_risk);

-- 5. Admin Copilot Notes
CREATE TABLE public.sps_ai_admin_copilot_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'summary',
  summary text,
  watchouts text,
  recommended_action text,
  why_it_matters text,
  advisor_note_draft text,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sps_copilot_entity ON public.sps_ai_admin_copilot_notes(entity_type, entity_id);

-- 6. Intelligence Alerts
CREATE TABLE public.sps_ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  priority text NOT NULL DEFAULT 'info',
  asset_id uuid,
  contract_id uuid,
  customer_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  explanation text,
  status text NOT NULL DEFAULT 'active',
  generated_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  dismissed_by uuid
);
CREATE INDEX idx_sps_alerts_status ON public.sps_ai_alerts(status, priority);
CREATE INDEX idx_sps_alerts_date ON public.sps_ai_alerts(generated_at DESC);

-- ══════════════════════════════════════════════════════════════
-- RLS — Admin-only read; service_role writes
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.sps_ai_predictive_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sps_ai_contract_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sps_ai_contract_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sps_ai_admin_copilot_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sps_ai_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read predictive maintenance" ON public.sps_ai_predictive_maintenance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read contract profitability" ON public.sps_ai_contract_profitability FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read contract signals" ON public.sps_ai_contract_signals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read copilot notes" ON public.sps_ai_admin_copilot_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read alerts" ON public.sps_ai_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update alerts" ON public.sps_ai_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
