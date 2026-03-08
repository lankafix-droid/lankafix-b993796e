
-- Add dispatch tracking columns to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS dispatch_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dispatch_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS dispatch_round integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promised_eta_minutes integer,
  ADD COLUMN IF NOT EXISTS actual_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS selected_partner_id uuid REFERENCES public.partners(id);

-- Create dispatch_escalations table for ops
CREATE TABLE IF NOT EXISTS public.dispatch_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'no_partners_found',
  dispatch_rounds_attempted integer DEFAULT 0,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage escalations" ON public.dispatch_escalations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create partner_notifications table
CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'job_offer',
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  actioned_at timestamptz,
  action_taken text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own notifications" ON public.partner_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = partner_notifications.partner_id));

CREATE POLICY "Partners can update own notifications" ON public.partner_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM partners WHERE id = partner_notifications.partner_id));

CREATE POLICY "Admins can manage notifications" ON public.partner_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for partner_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_notifications;
