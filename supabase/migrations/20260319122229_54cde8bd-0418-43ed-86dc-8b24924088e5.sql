
-- Add availability_last_updated to partners (dedicated freshness field)
ALTER TABLE public.partners 
  ADD COLUMN IF NOT EXISTS availability_last_updated timestamptz DEFAULT now();

-- Add response_notes to leads for partner commentary
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS response_notes text;
