
-- ETA Predictions table for logging and accuracy measurement
CREATE TABLE public.eta_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  eta_min_minutes INTEGER NOT NULL,
  eta_max_minutes INTEGER NOT NULL,
  estimate_minutes INTEGER NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  traffic_level TEXT NOT NULL DEFAULT 'normal',
  traffic_label TEXT,
  distance_km NUMERIC(6,1) NOT NULL DEFAULT 0,
  travel_type TEXT NOT NULL DEFAULT 'cross_city',
  technician_zone TEXT,
  customer_zone TEXT,
  source_context TEXT NOT NULL DEFAULT 'tracker',
  -- Accuracy fields (filled on arrival)
  actual_arrival_at TIMESTAMPTZ,
  actual_travel_minutes INTEGER,
  prediction_error_minutes INTEGER,
  within_range BOOLEAN,
  accuracy_class TEXT, -- 'early', 'on_time', 'late'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_eta_predictions_booking ON public.eta_predictions(booking_id);
CREATE INDEX idx_eta_predictions_partner ON public.eta_predictions(partner_id);
CREATE INDEX idx_eta_predictions_accuracy ON public.eta_predictions(accuracy_class) WHERE accuracy_class IS NOT NULL;

-- RLS
ALTER TABLE public.eta_predictions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage ETA predictions"
  ON public.eta_predictions FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view own predictions
CREATE POLICY "Partners can view own ETA predictions"
  ON public.eta_predictions FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = eta_predictions.partner_id));

-- Customers can view predictions for own bookings
CREATE POLICY "Customers can view own booking ETAs"
  ON public.eta_predictions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = eta_predictions.booking_id AND b.customer_id = auth.uid()));

-- System insert (authenticated users can insert for their bookings)
CREATE POLICY "Authenticated can insert ETA predictions"
  ON public.eta_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Partners can update accuracy on their predictions
CREATE POLICY "Partners can update own ETA accuracy"
  ON public.eta_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = eta_predictions.partner_id));
