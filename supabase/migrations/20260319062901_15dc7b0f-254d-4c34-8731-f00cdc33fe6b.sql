
-- Add partner response tracking fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS partner_response_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS partner_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by_partner_id UUID REFERENCES public.partners(id),
  ADD COLUMN IF NOT EXISTS assignment_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS routing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS operator_notes TEXT,
  ADD COLUMN IF NOT EXISTS operator_hold_reason TEXT;

-- Add index for partner response queries
CREATE INDEX IF NOT EXISTS idx_leads_partner_response ON public.leads(partner_response_status);
CREATE INDEX IF NOT EXISTS idx_leads_routing_status ON public.leads(routing_status);
