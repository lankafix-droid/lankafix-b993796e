
-- Atomic rate limit check function
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
  -- Delete old entries for this identifier/endpoint (probabilistic - only runs here)
  DELETE FROM public.ai_rate_limits
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND window_start < _window_start;

  -- Try to increment existing record atomically
  UPDATE public.ai_rate_limits
  SET request_count = request_count + 1
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND window_start >= _window_start
  RETURNING request_count INTO _current_count;

  -- If no row was updated, insert a new one
  IF _current_count IS NULL THEN
    INSERT INTO public.ai_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (_identifier, _endpoint, 1, now());
    RETURN true;
  END IF;

  -- Check if over limit (we already incremented, so check against max)
  IF _current_count > _max_requests THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
