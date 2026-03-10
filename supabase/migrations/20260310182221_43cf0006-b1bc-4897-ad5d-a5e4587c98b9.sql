
CREATE TABLE public.ai_interaction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_type TEXT NOT NULL DEFAULT 'search',
  user_id UUID,
  input_query TEXT,
  input_image_url TEXT,
  ai_model TEXT,
  ai_response JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  matched_category TEXT,
  matched_service TEXT,
  urgency_level TEXT,
  user_accepted BOOLEAN,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert AI logs" ON public.ai_interaction_logs
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage AI logs" ON public.ai_interaction_logs
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own AI logs" ON public.ai_interaction_logs
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE INDEX idx_ai_logs_type ON public.ai_interaction_logs (interaction_type);
CREATE INDEX idx_ai_logs_category ON public.ai_interaction_logs (matched_category);
CREATE INDEX idx_ai_logs_created ON public.ai_interaction_logs (created_at DESC);
