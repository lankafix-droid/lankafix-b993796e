
-- Add dispatch_round to dispatch_log
ALTER TABLE public.dispatch_log
  ADD COLUMN IF NOT EXISTS dispatch_round integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS response_time_seconds integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}'::jsonb;

-- Add dispatch config to platform_settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('dispatch_weights', '{
    "proximity": 0.30,
    "specialization": 0.20,
    "rating": 0.15,
    "response_speed": 0.10,
    "workload": 0.10,
    "completion_rate": 0.10,
    "emergency_priority": 0.05
  }'::jsonb),
  ('dispatch_modes', '{
    "MOBILE": "auto",
    "IT": "auto",
    "AC": "auto",
    "CONSUMER_ELEC": "auto",
    "COPIER": "auto",
    "PRINT_SUPPLIES": "auto",
    "CCTV": "top_3",
    "SOLAR": "manual",
    "SMART_HOME_OFFICE": "top_3"
  }'::jsonb),
  ('dispatch_limits', '{
    "accept_timeout_seconds": 60,
    "emergency_accept_timeout_seconds": 45,
    "max_dispatch_rounds": 5,
    "max_distance_km": 25,
    "emergency_max_distance_km": 15
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Index for dispatch_round
CREATE INDEX IF NOT EXISTS idx_dispatch_log_round ON public.dispatch_log (booking_id, dispatch_round);
