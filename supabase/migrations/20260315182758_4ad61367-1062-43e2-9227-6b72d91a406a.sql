
CREATE TABLE public.self_healing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'booking',
  entity_id UUID NOT NULL,
  recovery_type TEXT NOT NULL DEFAULT '',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'success',
  cooldown_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.self_healing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage self healing events" ON public.self_healing_events FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read self healing events" ON public.self_healing_events FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_self_healing_entity ON public.self_healing_events (entity_type, entity_id);
CREATE INDEX idx_self_healing_created ON public.self_healing_events (created_at DESC);
