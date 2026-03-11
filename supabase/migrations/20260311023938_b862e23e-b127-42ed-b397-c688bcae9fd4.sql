
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'customer',
  policy_group text NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  platform_source text DEFAULT 'web',
  session_info jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, policy_group, terms_version)
);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptances"
  ON public.terms_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptances"
  ON public.terms_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage terms acceptances"
  ON public.terms_acceptances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
