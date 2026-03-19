
CREATE TABLE public.demand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  category_code TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'callback',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  preferred_time TEXT DEFAULT 'asap',
  budget_range TEXT,
  images JSON DEFAULT '[]'::json,
  priority TEXT NOT NULL DEFAULT 'medium',
  priority_score INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSON,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even anon for lead capture)
CREATE POLICY "Anyone can submit demand requests"
  ON public.demand_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can see their own requests
CREATE POLICY "Users can view own requests"
  ON public.demand_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all demand requests"
  ON public.demand_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update demand requests"
  ON public.demand_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_demand_requests_updated_at
  BEFORE UPDATE ON public.demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
