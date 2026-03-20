
-- Add expires_at to alerts for automatic expiry handling
ALTER TABLE public.sps_ai_alerts ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index for dedup lookups (alert_type + status)
CREATE INDEX IF NOT EXISTS idx_sps_ai_alerts_dedup ON public.sps_ai_alerts (alert_type, status);

-- Index for active alert fetching
CREATE INDEX IF NOT EXISTS idx_sps_ai_alerts_active ON public.sps_ai_alerts (status, priority, generated_at DESC) WHERE status = 'active';

-- Auto-expire old alerts function
CREATE OR REPLACE FUNCTION public.expire_stale_sps_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE expired_count integer;
BEGIN
  UPDATE public.sps_ai_alerts
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
