
-- Add unique constraint for atomic upsert
ALTER TABLE public.ai_rate_limits ADD CONSTRAINT ai_rate_limits_identifier_endpoint_key UNIQUE (identifier, endpoint);

-- Replace check_rate_limit with race-condition-safe version using INSERT ON CONFLICT
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _endpoint text,
  _max_requests integer,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz := now() - (_window_seconds || ' seconds')::interval;
  _current_count integer;
BEGIN
  -- Probabilistic cleanup: ~1 in 50 requests
  IF random() < 0.02 THEN
    DELETE FROM public.ai_rate_limits
    WHERE window_start < now() - interval '5 minutes';
  END IF;

  -- Delete stale entry for this identifier+endpoint if window expired
  DELETE FROM public.ai_rate_limits
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND window_start < _window_start;

  -- Atomic upsert: insert or increment
  INSERT INTO public.ai_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (_identifier, _endpoint, 1, now())
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET request_count = public.ai_rate_limits.request_count + 1
  RETURNING request_count INTO _current_count;

  -- Check limit
  RETURN _current_count <= _max_requests;
END;
$$;
