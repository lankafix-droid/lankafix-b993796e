
-- Add address verification state column
ALTER TABLE public.customer_addresses 
ADD COLUMN IF NOT EXISTS verification_state text NOT NULL DEFAULT 'needs_verification';

-- Add admin override columns
ALTER TABLE public.customer_addresses
ADD COLUMN IF NOT EXISTS admin_serviceability_override boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_override_by uuid,
ADD COLUMN IF NOT EXISTS admin_override_at timestamptz;

-- Enhance coverage_waitlist with analytics columns
ALTER TABLE public.coverage_waitlist
ADD COLUMN IF NOT EXISTS reason_code text DEFAULT 'outside_coverage',
ADD COLUMN IF NOT EXISTS requested_zone text,
ADD COLUMN IF NOT EXISTS serviceability_status text,
ADD COLUMN IF NOT EXISTS source_screen text,
ADD COLUMN IF NOT EXISTS created_from_booking_gate boolean DEFAULT false;

-- Create booking_readiness_overrides for admin controls
CREATE TABLE IF NOT EXISTS public.booking_readiness_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text,
  customer_id uuid NOT NULL,
  override_type text NOT NULL,
  override_reason text,
  overridden_by uuid NOT NULL,
  category_code text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.booking_readiness_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage readiness overrides"
ON public.booking_readiness_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create RPC for backend booking validation
CREATE OR REPLACE FUNCTION public.validate_booking_readiness(
  _user_id uuid,
  _category_code text,
  _address_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{"ready": false, "missing": [], "errors": []}'::jsonb;
  _profile record;
  _address record;
  _missing text[] := '{}';
  _errors text[] := '{}';
  _has_override boolean;
BEGIN
  -- 1. Check profile exists
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready', false, 'missing', ARRAY['profile'], 'errors', ARRAY['No profile found']);
  END IF;

  -- 2. Check required identity fields
  IF COALESCE(_profile.full_name, '') = '' THEN _missing := array_append(_missing, 'full_name'); END IF;
  IF COALESCE(_profile.phone, '') = '' THEN _missing := array_append(_missing, 'phone'); END IF;

  -- 3. Check address
  IF _address_id IS NOT NULL THEN
    SELECT * INTO _address FROM public.customer_addresses WHERE id = _address_id AND customer_id = _user_id;
  ELSE
    SELECT * INTO _address FROM public.customer_addresses WHERE customer_id = _user_id AND is_default = true LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO _address FROM public.customer_addresses WHERE customer_id = _user_id LIMIT 1;
    END IF;
  END IF;

  IF NOT FOUND OR _address IS NULL THEN
    _missing := array_append(_missing, 'address');
  ELSE
    -- Check serviceability
    IF _address.admin_serviceability_override = true THEN
      -- Admin overrode, allow
      NULL;
    ELSIF _address.phase1_serviceable IS NOT TRUE THEN
      -- Check if verification_state blocks booking
      IF _address.verification_state = 'outside_coverage' THEN
        _errors := array_append(_errors, 'address_outside_coverage');
      ELSIF _address.verification_state = 'needs_verification' THEN
        _missing := array_append(_missing, 'address_verification');
      ELSE
        _missing := array_append(_missing, 'serviceable_address');
      END IF;
    END IF;
    -- Manual addresses without coordinates
    IF _address.latitude IS NULL OR _address.longitude IS NULL THEN
      IF _address.admin_serviceability_override IS NOT TRUE THEN
        _missing := array_append(_missing, 'address_coordinates');
      END IF;
    END IF;
  END IF;

  -- 4. Check consents for category
  IF _category_code IN ('MOBILE', 'IT') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.consent_records
      WHERE user_id = _user_id AND consent_type = 'category_requirement'
        AND consent_key IN ('data_risk', 'backup_recommendation', 'pin_sharing')
        AND accepted = true
    ) THEN
      _missing := array_append(_missing, 'category_consents');
    END IF;
  END IF;

  -- 5. Check admin overrides
  SELECT EXISTS(
    SELECT 1 FROM public.booking_readiness_overrides
    WHERE customer_id = _user_id
      AND (category_code = _category_code OR category_code IS NULL)
      AND override_type = 'full_bypass'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_override;

  IF _has_override THEN
    RETURN jsonb_build_object('ready', true, 'missing', '[]'::jsonb, 'errors', '[]'::jsonb, 'admin_override', true);
  END IF;

  RETURN jsonb_build_object(
    'ready', array_length(_missing, 1) IS NULL AND array_length(_errors, 1) IS NULL,
    'missing', to_jsonb(_missing),
    'errors', to_jsonb(_errors),
    'admin_override', false
  );
END;
$$;

-- Create safe default address function
CREATE OR REPLACE FUNCTION public.set_default_address_safe(
  _user_id uuid,
  _address_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _address record;
  _count int;
BEGIN
  -- Verify ownership
  SELECT * INTO _address FROM public.customer_addresses WHERE id = _address_id AND customer_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Address not found or not owned');
  END IF;

  -- Unset all defaults, then set the new one
  UPDATE public.customer_addresses SET is_default = false WHERE customer_id = _user_id;
  UPDATE public.customer_addresses SET is_default = true WHERE id = _address_id;
  UPDATE public.profiles SET primary_address_id = _address_id WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
