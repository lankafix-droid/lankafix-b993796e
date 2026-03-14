
-- Service Evidence table for before/after photos, notes, confirmation, disputes
CREATE TABLE public.service_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id),
  customer_id uuid,
  
  -- Before evidence
  before_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  before_notes text,
  before_uploaded_at timestamptz,
  
  -- After evidence
  after_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_notes text,
  after_uploaded_at timestamptz,
  
  -- Completion
  completion_notes text,
  technician_notes text,
  
  -- Customer confirmation
  customer_confirmed boolean DEFAULT false,
  customer_confirmed_at timestamptz,
  customer_dispute boolean DEFAULT false,
  dispute_reason text,
  dispute_opened_at timestamptz,
  dispute_resolved_at timestamptz,
  
  -- Privacy consent
  photo_consent text DEFAULT 'private',
  
  -- Service verified badge
  service_verified boolean DEFAULT false,
  
  -- Evidence requirements
  evidence_required boolean DEFAULT true,
  min_before_photos integer DEFAULT 1,
  min_after_photos integer DEFAULT 1,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.service_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage evidence"
  ON public.service_evidence FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view own evidence"
  ON public.service_evidence FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update own evidence"
  ON public.service_evidence FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Partners can manage assigned evidence"
  ON public.service_evidence FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT p.user_id FROM partners p WHERE p.id = service_evidence.partner_id
  ));

CREATE POLICY "Partners can insert evidence"
  ON public.service_evidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_service_evidence_updated_at
  BEFORE UPDATE ON public.service_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add evidence_status to bookings for proof workflow tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS evidence_status text DEFAULT 'none';
