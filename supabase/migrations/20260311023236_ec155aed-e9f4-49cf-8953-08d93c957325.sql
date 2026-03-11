
-- 1. Create public bucket for provider profile photos (separate from private docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-profile-photos', 'partner-profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage policies for profile photos bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can upload profile photos' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated can upload profile photos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'partner-profile-photos' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profile photos are publicly readable' AND tablename = 'objects') THEN
    CREATE POLICY "Profile photos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'partner-profile-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile photos' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update own profile photos"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'partner-profile-photos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 3. Add rejection_reason column to partner_documents
ALTER TABLE public.partner_documents ADD COLUMN IF NOT EXISTS rejection_reason text;
