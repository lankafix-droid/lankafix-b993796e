
-- Add insert policy for campaign_attributions (system inserts via service role, but add for completeness)
CREATE POLICY "Admins can insert attributions"
  ON public.campaign_attributions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
