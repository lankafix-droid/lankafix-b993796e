CREATE TABLE public.incident_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  description TEXT NOT NULL DEFAULT '',
  trigger_metric TEXT NOT NULL DEFAULT '',
  recommended_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsible_team TEXT NOT NULL DEFAULT 'Operations',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.incident_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage incident playbooks"
  ON public.incident_playbooks FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read incident playbooks"
  ON public.incident_playbooks FOR SELECT
  TO authenticated
  USING (true);