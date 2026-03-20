
-- Pipeline run history log
CREATE TABLE public.pipeline_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  fetched INTEGER DEFAULT 0,
  normalized INTEGER DEFAULT 0,
  deduped INTEGER DEFAULT 0,
  title_rejected INTEGER DEFAULT 0,
  low_quality_rejected INTEGER DEFAULT 0,
  low_relevance_rejected INTEGER DEFAULT 0,
  briefed INTEGER DEFAULT 0,
  published INTEGER DEFAULT 0,
  needs_review INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  decayed INTEGER DEFAULT 0,
  surfaces_refreshed INTEGER DEFAULT 0,
  clusters_created INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  source_breakdown JSONB,
  error_details TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pipeline runs are publicly readable"
ON public.pipeline_runs FOR SELECT USING (true);

CREATE INDEX idx_pipeline_runs_started ON public.pipeline_runs(started_at DESC);

-- Content operational alerts
CREATE TABLE public.content_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  source_id UUID REFERENCES public.content_sources(id),
  surface_code TEXT,
  category_code TEXT,
  pipeline_run_id UUID REFERENCES public.pipeline_runs(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content alerts are publicly readable"
ON public.content_alerts FOR SELECT USING (true);

CREATE INDEX idx_content_alerts_active ON public.content_alerts(created_at DESC) WHERE resolved_at IS NULL;

-- Add rollout_state to content_sources
ALTER TABLE public.content_sources
ADD COLUMN IF NOT EXISTS rollout_state TEXT NOT NULL DEFAULT 'inactive';

-- Add surface_rollout_mode to track per-surface rollout
CREATE TABLE public.content_surface_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surface_code TEXT NOT NULL UNIQUE,
  rollout_mode TEXT NOT NULL DEFAULT 'evergreen_only',
  frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMPTZ,
  frozen_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_surface_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surface config publicly readable"
ON public.content_surface_config FOR SELECT USING (true);

-- Seed default surface configs
INSERT INTO public.content_surface_config (surface_code, rollout_mode) VALUES
  ('homepage_hero', 'evergreen_only'),
  ('homepage_hot_now', 'evergreen_only'),
  ('homepage_did_you_know', 'evergreen_only'),
  ('homepage_innovations', 'evergreen_only'),
  ('homepage_safety', 'evergreen_only'),
  ('homepage_numbers', 'evergreen_only'),
  ('homepage_popular', 'evergreen_only'),
  ('ai_banner_forum', 'evergreen_only'),
  ('category_featured', 'evergreen_only'),
  ('category_feed', 'evergreen_only')
ON CONFLICT (surface_code) DO NOTHING;
