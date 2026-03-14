
-- 1. Add missing columns to service_evidence
ALTER TABLE public.service_evidence
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS uploaded_by_role text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS category_code text,
  ADD COLUMN IF NOT EXISTS device_id uuid,
  ADD COLUMN IF NOT EXISTS warranty_activated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_text text,
  ADD COLUMN IF NOT EXISTS maintenance_due_date timestamptz,
  ADD COLUMN IF NOT EXISTS visibility_mode text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS privacy_flags jsonb DEFAULT '{}'::jsonb;

-- 2. Create device_registry table
CREATE TABLE IF NOT EXISTS public.device_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_type text NOT NULL,
  category_code text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text,
  purchase_year integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON public.device_registry
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.device_registry
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.device_registry
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.device_registry
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage device registry" ON public.device_registry
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create service-evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-evidence', 'service-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-evidence');

CREATE POLICY "Authenticated users can view own evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'service-evidence');

-- 5. Trigger for updated_at on device_registry
CREATE TRIGGER update_device_registry_updated_at
  BEFORE UPDATE ON public.device_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
