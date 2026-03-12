
CREATE TABLE public.support_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  issue_type TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID
);

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support cases"
  ON public.support_cases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support cases"
  ON public.support_cases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support cases"
  ON public.support_cases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_cases_booking ON public.support_cases(booking_id);
CREATE INDEX idx_support_cases_status ON public.support_cases(status);
