-- 1. Drop the permissive "Anyone can insert" policy on ai_interaction_logs
DROP POLICY IF EXISTS "Anyone can insert AI logs" ON public.ai_interaction_logs;

-- 2. Add conversion tracking fields
ALTER TABLE public.ai_interaction_logs 
  ADD COLUMN IF NOT EXISTS converted_to_booking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_time_ms integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_platform text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_size_bytes integer DEFAULT NULL;