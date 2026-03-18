-- Fix: Allow authenticated users to insert their own campaign attributions
-- Previously only admins could insert, but regular users trigger attribution
-- via writeAttribution() when interacting with campaigns
CREATE POLICY "Authenticated users can insert attributions"
ON public.campaign_attributions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix: Allow anonymous campaign event inserts (user_id can be null for unauthenticated)
-- The existing policy requires auth.uid() = user_id which blocks null user_id inserts
CREATE POLICY "Anon can insert campaign events"
ON public.campaign_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);