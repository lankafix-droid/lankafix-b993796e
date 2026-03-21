
-- Enhance profiles table for progressive profiling
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS auth_providers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_completion_pct integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add district column to customer_addresses
ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS district text;

-- Update handle_new_user to also capture email and avatar from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url, auth_providers)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    ARRAY[COALESCE(NEW.raw_app_meta_data->>'provider', 'email')]
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE WHEN COALESCE(profiles.full_name, '') = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    email = CASE WHEN COALESCE(profiles.email, '') = '' THEN EXCLUDED.email ELSE profiles.email END,
    avatar_url = CASE WHEN COALESCE(profiles.avatar_url, '') = '' THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    auth_providers = ARRAY(SELECT DISTINCT unnest(profiles.auth_providers || EXCLUDED.auth_providers)),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pct integer := 0;
  p record;
  has_address boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Each field worth ~14% (7 fields = ~100%)
  IF COALESCE(p.full_name, '') != '' THEN pct := pct + 15; END IF;
  IF COALESCE(p.email, '') != '' THEN pct := pct + 15; END IF;
  IF COALESCE(p.phone, '') != '' THEN pct := pct + 20; END IF;
  IF COALESCE(p.avatar_url, '') != '' THEN pct := pct + 10; END IF;
  IF COALESCE(p.district, '') != '' THEN pct := pct + 10; END IF;

  SELECT EXISTS(SELECT 1 FROM public.customer_addresses WHERE customer_id = _user_id LIMIT 1) INTO has_address;
  IF has_address THEN pct := pct + 20; END IF;

  IF COALESCE(p.preferred_contact_method, '') != '' THEN pct := pct + 10; END IF;

  -- Cap at 100
  RETURN LEAST(pct, 100);
END;
$$;
