
-- Add response_token to leads for secure partner response links
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS response_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS response_token_expires_at timestamptz;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_leads_response_token ON public.leads (response_token) WHERE response_token IS NOT NULL;
