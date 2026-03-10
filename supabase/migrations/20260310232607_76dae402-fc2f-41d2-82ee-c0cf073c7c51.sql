
-- 1. Create ai_rate_limits table for centralized rate limiting
CREATE TABLE public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_ai_rate_limits_lookup ON public.ai_rate_limits (identifier, endpoint, window_start);

-- RLS: no client access, only service role
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old rate limit entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ai_rate_limits WHERE window_start < now() - interval '5 minutes';
$$;

-- 2. Add analytics fields to ai_interaction_logs
ALTER TABLE public.ai_interaction_logs
  ADD COLUMN IF NOT EXISTS confidence_bucket text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_action text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recommended_service_used boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_service_selected text DEFAULT NULL;
