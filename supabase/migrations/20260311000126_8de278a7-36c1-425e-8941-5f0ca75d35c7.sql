
-- Add matching-relevant fields to partners table
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS on_time_rate numeric DEFAULT 95,
  ADD COLUMN IF NOT EXISTS quote_approval_rate numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS inspection_capable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_capable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_types_supported text[] DEFAULT '{}';

-- Create match_logs table for analytics
CREATE TABLE IF NOT EXISTS public.match_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  category_code text NOT NULL,
  service_type text,
  customer_zone text,
  is_emergency boolean DEFAULT false,
  ranked_technicians jsonb DEFAULT '[]'::jsonb,
  selected_technician_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  auto_assigned boolean DEFAULT false,
  top_match_score numeric,
  top_match_reason text,
  no_match_found boolean DEFAULT false,
  total_candidates integer DEFAULT 0,
  match_duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage match logs"
  ON public.match_logs FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'));
