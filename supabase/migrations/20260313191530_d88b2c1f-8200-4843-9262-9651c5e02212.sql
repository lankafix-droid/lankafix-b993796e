
-- Module 13: Centralized automation event log
CREATE TABLE public.automation_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  customer_id UUID,
  trigger_reason TEXT NOT NULL,
  action_taken TEXT NOT NULL DEFAULT 'logged',
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}'::jsonb,
  reversible BOOLEAN DEFAULT true,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ops dashboard queries
CREATE INDEX idx_automation_event_log_type ON public.automation_event_log(event_type);
CREATE INDEX idx_automation_event_log_created ON public.automation_event_log(created_at DESC);
CREATE INDEX idx_automation_event_log_booking ON public.automation_event_log(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_automation_event_log_partner ON public.automation_event_log(partner_id) WHERE partner_id IS NOT NULL;

-- RLS
ALTER TABLE public.automation_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation logs"
  ON public.automation_event_log FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Automation logs readable by authenticated"
  ON public.automation_event_log FOR SELECT
  TO authenticated
  USING (true);
