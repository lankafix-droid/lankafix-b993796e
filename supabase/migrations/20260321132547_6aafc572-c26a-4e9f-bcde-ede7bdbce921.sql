
-- ============================================
-- Enhanced profiles for Phase-1 Colombo launch
-- ============================================

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_address_id uuid REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS serviceability_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_selected_service_category text,
  ADD COLUMN IF NOT EXISTS consent_flags jsonb DEFAULT '{}'::jsonb;

-- Enhanced customer_addresses with Phase-1 serviceability
ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS service_zone text,
  ADD COLUMN IF NOT EXISTS phase1_serviceable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_or_unit text,
  ADD COLUMN IF NOT EXISTS parking_notes text,
  ADD COLUMN IF NOT EXISTS access_notes text;

-- ============================================
-- Consent records table for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  consent_key text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  context jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON public.consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_consent_records_user_type
  ON public.consent_records(user_id, consent_type, consent_key);

-- ============================================
-- Waitlist for out-of-coverage users
-- ============================================
CREATE TABLE IF NOT EXISTS public.coverage_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  phone text,
  email text,
  latitude double precision,
  longitude double precision,
  city text,
  district text,
  requested_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coverage_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert waitlist"
  ON public.coverage_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own waitlist"
  ON public.coverage_waitlist FOR SELECT
  USING (auth.uid() = user_id);
