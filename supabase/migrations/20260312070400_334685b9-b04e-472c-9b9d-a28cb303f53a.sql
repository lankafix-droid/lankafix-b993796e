
-- Fix: Replace overly permissive INSERT policy with a scoped one
DROP POLICY "Service inserts for incidents" ON public.system_incidents;

-- Allow any authenticated user to insert (error logging from client)
-- but restrict columns via the table defaults
CREATE POLICY "Authenticated can log incidents"
  ON public.system_incidents FOR INSERT
  TO authenticated
  WITH CHECK (resolved_at IS NULL AND resolved_by IS NULL);

-- Add SELECT for authenticated (read own incidents in ops)
CREATE POLICY "Authenticated can view incidents"
  ON public.system_incidents FOR SELECT
  TO authenticated
  USING (true);
