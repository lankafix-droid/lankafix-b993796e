
-- Fix RLS: restrict demand_contact_logs to admins only
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.demand_contact_logs;

CREATE POLICY "Admins can manage contact logs" ON public.demand_contact_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
