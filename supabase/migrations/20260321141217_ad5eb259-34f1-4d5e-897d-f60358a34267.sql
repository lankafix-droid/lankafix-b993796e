
-- 1. Create booking_intake_answers table for persisting category answers
CREATE TABLE public.booking_intake_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_code TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_outcome TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_code)
);
ALTER TABLE public.booking_intake_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own intake answers"
  ON public.booking_intake_answers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_booking_intake_answers_updated_at
  BEFORE UPDATE ON public.booking_intake_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add audit fields to booking_readiness_overrides
ALTER TABLE public.booking_readiness_overrides
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_user_id UUID;

-- 3. Upgrade consent_records: add accepted_at explicitly
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT now();

-- 4. Upgrade set_default_address_safe to auto-promote on delete
CREATE OR REPLACE FUNCTION public.auto_promote_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _next_id uuid;
BEGIN
  -- Only act if we deleted a default address
  IF OLD.is_default = true THEN
    -- Find the next best address: serviceable first, then any
    SELECT id INTO _next_id
    FROM public.customer_addresses
    WHERE customer_id = OLD.customer_id AND id != OLD.id
    ORDER BY
      (phase1_serviceable = true OR admin_serviceability_override = true) DESC,
      created_at ASC
    LIMIT 1;

    IF _next_id IS NOT NULL THEN
      UPDATE public.customer_addresses SET is_default = true WHERE id = _next_id;
      UPDATE public.profiles SET primary_address_id = _next_id WHERE user_id = OLD.customer_id;
    ELSE
      UPDATE public.profiles SET primary_address_id = NULL WHERE user_id = OLD.customer_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_auto_promote_default_address
  AFTER DELETE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_default_address();

-- 5. Auto-set first address as default
CREATE OR REPLACE FUNCTION public.auto_default_first_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _count int;
BEGIN
  SELECT count(*) INTO _count FROM public.customer_addresses WHERE customer_id = NEW.customer_id AND id != NEW.id;
  IF _count = 0 THEN
    NEW.is_default := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_default_first_address
  BEFORE INSERT ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.auto_default_first_address();

-- 6. Upgrade validate_booking_readiness to be the true source of truth
CREATE OR REPLACE FUNCTION public.validate_booking_readiness(
  _user_id uuid,
  _category_code text,
  _address_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile record;
  _address record;
  _missing text[] := '{}';
  _errors text[] := '{}';
  _has_override boolean;
  _intake record;
  _outcome text := 'ready_for_booking';
  _cat_rules jsonb;
  _consent_keys text[];
  _required_consents text[];
  _escalation_actions text[] := '{}';
BEGIN
  -- 1. Profile
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready', false, 'outcome', 'blocked', 'missing', ARRAY['profile'], 'errors', ARRAY['no_profile']);
  END IF;
  IF COALESCE(_profile.full_name, '') = '' THEN _missing := array_append(_missing, 'full_name'); END IF;
  IF COALESCE(_profile.phone, '') = '' THEN _missing := array_append(_missing, 'phone'); END IF;

  -- 2. Address
  IF _address_id IS NOT NULL THEN
    SELECT * INTO _address FROM public.customer_addresses WHERE id = _address_id AND customer_id = _user_id;
  ELSE
    SELECT * INTO _address FROM public.customer_addresses WHERE customer_id = _user_id AND is_default = true LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO _address FROM public.customer_addresses WHERE customer_id = _user_id LIMIT 1;
    END IF;
  END IF;

  IF _address IS NULL THEN
    _missing := array_append(_missing, 'address');
  ELSE
    IF _address.admin_serviceability_override IS NOT TRUE THEN
      IF _address.verification_state = 'outside_coverage' THEN
        _errors := array_append(_errors, 'address_outside_coverage');
        _outcome := 'outside_coverage_waitlist';
      ELSIF _address.verification_state = 'needs_verification' THEN
        _missing := array_append(_missing, 'address_verification');
      ELSIF _address.phase1_serviceable IS NOT TRUE THEN
        _missing := array_append(_missing, 'serviceable_address');
      END IF;
      IF _address.latitude IS NULL OR _address.longitude IS NULL THEN
        _missing := array_append(_missing, 'address_coordinates');
      END IF;
    END IF;
  END IF;

  -- 3. Consents per category
  _required_consents := CASE _category_code
    WHEN 'MOBILE' THEN ARRAY['data_safety', 'backup_responsibility', 'pin_sharing']
    WHEN 'IT' THEN ARRAY['data_safety', 'data_risk', 'backup_recommendation']
    WHEN 'CONSUMER_ELEC' THEN ARRAY['data_safety', 'quote_variance']
    WHEN 'SMART_HOME_OFFICE' THEN ARRAY['inspection_first']
    WHEN 'SOLAR' THEN ARRAY['inspection_first']
    ELSE ARRAY['data_safety']
  END;

  SELECT array_agg(consent_key) INTO _consent_keys
  FROM public.consent_records
  WHERE user_id = _user_id AND accepted = true AND consent_key = ANY(_required_consents);

  IF _consent_keys IS NULL THEN _consent_keys := '{}'; END IF;

  FOR i IN 1..array_length(_required_consents, 1) LOOP
    IF NOT (_required_consents[i] = ANY(_consent_keys)) THEN
      _missing := array_append(_missing, 'consent:' || _required_consents[i]);
    END IF;
  END LOOP;

  -- 4. Category intake answers
  SELECT * INTO _intake FROM public.booking_intake_answers WHERE user_id = _user_id AND category_code = _category_code;
  IF NOT FOUND THEN
    _missing := array_append(_missing, 'category_answers');
  ELSE
    -- Check escalation outcomes stored by frontend
    IF _intake.escalation_outcome = 'inspection_only' THEN
      _outcome := 'ready_for_inspection_only';
    ELSIF _intake.escalation_outcome = 'blocked' THEN
      _outcome := 'blocked';
      _errors := array_append(_errors, 'escalation_blocked');
    ELSIF _intake.escalation_outcome = 'diagnostic_fee_required' THEN
      _outcome := 'ready_for_inspection_only';
    END IF;

    -- Validate required fields per category
    IF _category_code = 'MOBILE' THEN
      IF _intake.answers->>'service_type' IS NULL THEN _missing := array_append(_missing, 'category:service_type'); END IF;
      IF _intake.answers->>'brand' IS NULL THEN _missing := array_append(_missing, 'category:brand'); END IF;
      IF _intake.answers->>'issue_condition' IS NULL THEN _missing := array_append(_missing, 'category:issue_condition'); END IF;
    ELSIF _category_code = 'IT' THEN
      IF _intake.answers->>'support_type' IS NULL THEN _missing := array_append(_missing, 'category:support_type'); END IF;
      IF _intake.answers->>'environment_type' IS NULL THEN _missing := array_append(_missing, 'category:environment_type'); END IF;
      IF _intake.answers->>'device_type' IS NULL THEN _missing := array_append(_missing, 'category:device_type'); END IF;
      IF _intake.answers->>'issue_type' IS NULL THEN _missing := array_append(_missing, 'category:issue_type'); END IF;
    ELSIF _category_code = 'SOLAR' THEN
      IF _intake.answers->>'property_type' IS NULL THEN _missing := array_append(_missing, 'category:property_type'); END IF;
      IF _intake.answers->>'electricity_bill_range' IS NULL THEN _missing := array_append(_missing, 'category:electricity_bill_range'); END IF;
      IF _intake.answers->>'roof_type' IS NULL THEN _missing := array_append(_missing, 'category:roof_type'); END IF;
    ELSIF _category_code = 'CONSUMER_ELEC' THEN
      IF _intake.answers->>'appliance_type' IS NULL THEN _missing := array_append(_missing, 'category:appliance_type'); END IF;
      IF _intake.answers->>'issue_type' IS NULL THEN _missing := array_append(_missing, 'category:issue_type'); END IF;
    END IF;
  END IF;

  -- 5. Admin override check
  SELECT EXISTS(
    SELECT 1 FROM public.booking_readiness_overrides
    WHERE customer_id = _user_id
      AND (category_code = _category_code OR category_code IS NULL)
      AND override_type = 'full_bypass'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_override;

  IF _has_override THEN
    RETURN jsonb_build_object('ready', true, 'outcome', 'ready_for_booking', 'missing', '[]'::jsonb, 'errors', '[]'::jsonb, 'admin_override', true);
  END IF;

  -- 6. Determine final outcome
  IF array_length(_errors, 1) IS NOT NULL THEN
    IF _outcome = 'outside_coverage_waitlist' THEN NULL; -- keep
    ELSE _outcome := 'blocked'; END IF;
  ELSIF array_length(_missing, 1) IS NOT NULL THEN
    _outcome := 'blocked';
  END IF;

  RETURN jsonb_build_object(
    'ready', array_length(_missing, 1) IS NULL AND array_length(_errors, 1) IS NULL,
    'outcome', _outcome,
    'missing', to_jsonb(_missing),
    'errors', to_jsonb(_errors),
    'admin_override', false
  );
END;
$$;

-- 7. Enable realtime for intake answers (optional, for multi-device sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_intake_answers;
