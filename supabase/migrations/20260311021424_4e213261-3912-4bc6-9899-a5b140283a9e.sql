
-- Create partner_bank_accounts
CREATE TABLE public.partner_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  account_number text NOT NULL,
  branch text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

ALTER TABLE public.partner_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage own bank account"
  ON public.partner_bank_accounts FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = partner_bank_accounts.partner_id));

CREATE POLICY "Admins can manage bank accounts"
  ON public.partner_bank_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for partner uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-uploads', 'partner-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can upload own files' AND tablename = 'objects') THEN
    CREATE POLICY "Partners can upload own files"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'partner-uploads' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can view own files' AND tablename = 'objects') THEN
    CREATE POLICY "Partners can view own files"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'partner-uploads' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
