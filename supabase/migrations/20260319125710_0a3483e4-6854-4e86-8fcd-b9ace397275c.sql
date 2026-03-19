
-- ============================================================
-- PHASE 2: Admin Bootstrap + Technician System + Payment Model
-- ============================================================

-- 1. Allow first admin bootstrap: if no admins exist, any authenticated user can self-assign admin
CREATE OR REPLACE FUNCTION public.bootstrap_admin_if_none()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only works if there are zero admins
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Admin already exists. Use admin panel to assign roles.';
  END IF;
END;
$$;

-- 2. Add INSERT policy for bootstrap (if no admins exist)
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
);

-- 3. Technician job notes table for field updates
CREATE TABLE IF NOT EXISTS public.technician_job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  note_type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.technician_job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own job notes"
ON public.technician_job_notes FOR SELECT TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can create job notes"
ON public.technician_job_notes FOR INSERT TO authenticated
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- 4. Parts usage tracking for technicians
CREATE TABLE IF NOT EXISTS public.job_parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost_lkr INTEGER DEFAULT 0,
  total_cost_lkr INTEGER DEFAULT 0,
  source TEXT DEFAULT 'own_stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_parts_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can manage own parts usage"
ON public.job_parts_used FOR ALL TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- 5. Notification events backbone
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'customer',
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  booking_id UUID REFERENCES public.bookings(id),
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notification_queue FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
ON public.notification_queue FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Ensure payment tracking columns exist on bookings (most already exist)
-- Add payment_reference if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_reference') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_reference TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_gateway') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_gateway TEXT DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_amount_lkr') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_amount_lkr INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='paid_at') THEN
    ALTER TABLE public.bookings ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- 7. Index for technician job queries
CREATE INDEX IF NOT EXISTS idx_bookings_partner_status ON public.bookings(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON public.notification_queue(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_technician_job_notes_booking ON public.technician_job_notes(booking_id);
