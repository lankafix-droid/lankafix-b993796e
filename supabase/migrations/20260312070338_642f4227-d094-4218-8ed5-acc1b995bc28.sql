
-- Phase 7: System incidents table for error monitoring
CREATE TABLE public.system_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  incident_type TEXT NOT NULL DEFAULT 'error',
  severity TEXT NOT NULL DEFAULT 'warning',
  source TEXT NOT NULL DEFAULT 'unknown',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- RLS: Only admins can manage incidents
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage incidents"
  ON public.system_incidents FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role inserts (edge functions use service role)
CREATE POLICY "Service inserts for incidents"
  ON public.system_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for ops queries
CREATE INDEX idx_system_incidents_created ON public.system_incidents(created_at DESC);
CREATE INDEX idx_system_incidents_type ON public.system_incidents(incident_type);
CREATE INDEX idx_system_incidents_unresolved ON public.system_incidents(resolved_at) WHERE resolved_at IS NULL;
