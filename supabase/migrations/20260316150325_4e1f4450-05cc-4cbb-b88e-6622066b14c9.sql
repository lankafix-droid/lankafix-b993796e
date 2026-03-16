
-- Create a public storage bucket for booking photos
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload booking photos
CREATE POLICY "Authenticated users can upload booking photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'booking-photos');

-- Allow public read access to booking photos
CREATE POLICY "Public can view booking photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'booking-photos');

-- Allow users to delete their own booking photos
CREATE POLICY "Users can delete own booking photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'booking-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
