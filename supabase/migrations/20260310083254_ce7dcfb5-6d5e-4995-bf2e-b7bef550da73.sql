
-- Device Passports table
CREATE TABLE public.device_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_category text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text,
  device_nickname text NOT NULL,
  installation_location text NOT NULL DEFAULT '',
  installation_date date,
  purchase_date date,
  purchase_seller text,
  purchase_invoice_url text,
  health_score integer NOT NULL DEFAULT 100,
  total_service_cost integer NOT NULL DEFAULT 0,
  total_services_performed integer NOT NULL DEFAULT 0,
  owner_name text,
  qr_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON public.device_passports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON public.device_passports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON public.device_passports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON public.device_passports FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all devices"
  ON public.device_passports FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Service Ledger table
CREATE TABLE public.device_service_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_passport_id uuid NOT NULL REFERENCES public.device_passports(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  technician_id text,
  technician_name text,
  partner_id text,
  partner_name text,
  service_type text NOT NULL,
  diagnosis_result text,
  work_completed text NOT NULL,
  parts_replaced jsonb NOT NULL DEFAULT '[]',
  service_photos jsonb NOT NULL DEFAULT '[]',
  service_cost integer NOT NULL DEFAULT 0,
  job_id text,
  recommendations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_service_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service history"
  ON public.device_service_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.device_passports dp
    WHERE dp.id = device_service_ledger.device_passport_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert service entries"
  ON public.device_service_ledger FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.device_passports dp
    WHERE dp.id = device_service_ledger.device_passport_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage service ledger"
  ON public.device_service_ledger FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Warranty Records table
CREATE TABLE public.device_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_passport_id uuid NOT NULL REFERENCES public.device_passports(id) ON DELETE CASCADE,
  warranty_provider text NOT NULL,
  warranty_start_date date NOT NULL,
  warranty_end_date date NOT NULL,
  warranty_type text NOT NULL DEFAULT 'manufacturer',
  status text NOT NULL DEFAULT 'active',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own warranties"
  ON public.device_warranties FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.device_passports dp
    WHERE dp.id = device_warranties.device_passport_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert warranties"
  ON public.device_warranties FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.device_passports dp
    WHERE dp.id = device_warranties.device_passport_id
    AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage warranties"
  ON public.device_warranties FOR ALL
  USING (has_role(auth.uid(), 'admin'));
