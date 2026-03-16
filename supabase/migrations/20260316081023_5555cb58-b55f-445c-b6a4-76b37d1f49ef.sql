
CREATE TABLE public.reliability_operator_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL DEFAULT 'reliability_note',
  action_title TEXT NOT NULL DEFAULT '',
  source_context TEXT NOT NULL DEFAULT 'manual',
  source_zone_id TEXT,
  source_category_code TEXT,
  source_severity TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner_name TEXT,
  owner_role TEXT,
  note TEXT NOT NULL DEFAULT '',
  decision_summary TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.reliability_operator_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read operator actions"
ON public.reliability_operator_actions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage operator actions"
ON public.reliability_operator_actions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_operator_actions_status ON public.reliability_operator_actions(status);
CREATE INDEX idx_operator_actions_priority ON public.reliability_operator_actions(priority);
CREATE INDEX idx_operator_actions_created ON public.reliability_operator_actions(created_at DESC);
