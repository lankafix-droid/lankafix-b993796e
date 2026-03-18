
-- Training completion tracking for operators
CREATE TABLE public.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage training completions"
  ON public.training_completions FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own training"
  ON public.training_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own training"
  ON public.training_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
