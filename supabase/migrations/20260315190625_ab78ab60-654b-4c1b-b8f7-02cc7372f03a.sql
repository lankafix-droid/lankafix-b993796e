
CREATE TABLE public.reliability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reliability_score integer NOT NULL DEFAULT 0,
  success_rate integer NOT NULL DEFAULT 100,
  escalation_rate integer NOT NULL DEFAULT 0,
  circuit_break_count integer NOT NULL DEFAULT 0,
  confidence_score integer NOT NULL DEFAULT 100,
  executive_verdict text NOT NULL DEFAULT 'STABLE',
  risk_probability integer NOT NULL DEFAULT 0,
  zone_summary_json jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.reliability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reliability snapshots"
ON public.reliability_snapshots
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read reliability snapshots"
ON public.reliability_snapshots
FOR SELECT
TO authenticated
USING (true);
