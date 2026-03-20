
-- Allow edge function (service role) to insert pipeline runs and alerts
-- These tables are written by edge functions using service_role key, so anon needs only SELECT
-- Add insert policy for service_role operations (via edge functions)
CREATE POLICY "Service can insert pipeline runs"
ON public.pipeline_runs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert content alerts"
ON public.content_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update content alerts"
ON public.content_alerts FOR UPDATE
USING (true);

CREATE POLICY "Surface config readable and updatable"
ON public.content_surface_config FOR UPDATE
USING (true);

CREATE POLICY "Service can insert surface config"
ON public.content_surface_config FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update pipeline runs"
ON public.pipeline_runs FOR UPDATE
USING (true);

CREATE POLICY "Service can update content sources rollout"
ON public.content_sources FOR UPDATE
USING (true);
