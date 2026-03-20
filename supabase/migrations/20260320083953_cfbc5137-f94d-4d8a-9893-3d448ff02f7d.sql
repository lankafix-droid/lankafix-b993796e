
-- Log retention: add index for time-based cleanup and auto-prune old logs
CREATE INDEX IF NOT EXISTS idx_sps_ai_logs_created_at ON public.sps_ai_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_sps_ai_logs_action_status ON public.sps_ai_logs (action, status);

-- Retention cleanup function: keep 90 days of logs, aggregate older into monthly summaries
CREATE OR REPLACE FUNCTION public.cleanup_sps_ai_logs(_retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.sps_ai_logs
  WHERE created_at < now() - (_retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add asset_id and contract_id to support triage for richer context
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS asset_brand text;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS asset_model text;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS plan_support_level text;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS prior_ticket_count integer DEFAULT 0;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS prior_same_category_count integer DEFAULT 0;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS asset_total_tickets integer DEFAULT 0;
