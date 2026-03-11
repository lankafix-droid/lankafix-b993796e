
-- partner_availability already exists as a type, use partner_schedules instead
CREATE TABLE IF NOT EXISTS public.partner_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  working_days text[] NOT NULL DEFAULT '{}',
  start_time text NOT NULL DEFAULT '08:00',
  end_time text NOT NULL DEFAULT '19:00',
  emergency_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

ALTER TABLE public.partner_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage own schedule"
  ON public.partner_schedules FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = partner_schedules.partner_id));

CREATE POLICY "Admins can manage schedules"
  ON public.partner_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 3. Policy / conduct acceptances
CREATE TABLE IF NOT EXISTS public.policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  policy_type text NOT NULL,
  policy_version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  UNIQUE(partner_id, policy_type)
);

ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own acceptances"
  ON public.policy_acceptances FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = policy_acceptances.partner_id));

CREATE POLICY "Partners can insert own acceptances"
  ON public.policy_acceptances FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM partners WHERE id = policy_acceptances.partner_id));

CREATE POLICY "Admins can manage acceptances"
  ON public.policy_acceptances FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 4. Add unique constraint on partners.user_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS partners_user_id_unique ON public.partners(user_id) WHERE user_id IS NOT NULL;

-- 5. Add missing columns to partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS nic_number text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS provider_type text DEFAULT 'individual';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS previous_company text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS tools_declared text[] DEFAULT '{}';
