
-- Reminder Jobs: tracks scheduled/sent/suppressed reminders
CREATE TABLE public.reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'customer',
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  suppression_reason TEXT,
  send_count INTEGER NOT NULL DEFAULT 0,
  payload_summary TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  advisory_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_jobs_booking ON public.reminder_jobs(booking_id);
CREATE INDEX idx_reminder_jobs_status ON public.reminder_jobs(status);
CREATE INDEX idx_reminder_jobs_scheduled ON public.reminder_jobs(scheduled_for);

ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminder_jobs" ON public.reminder_jobs
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own reminder_jobs" ON public.reminder_jobs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = reminder_jobs.booking_id AND b.customer_id = auth.uid())
  );

-- Reminder Send Logs: delivery attempt history
CREATE TABLE public.reminder_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_job_id UUID REFERENCES public.reminder_jobs(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_send_logs_job ON public.reminder_send_logs(reminder_job_id);
CREATE INDEX idx_reminder_send_logs_booking ON public.reminder_send_logs(booking_id);

ALTER TABLE public.reminder_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminder_send_logs" ON public.reminder_send_logs
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own send logs" ON public.reminder_send_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = reminder_send_logs.booking_id AND b.customer_id = auth.uid())
  );

-- Operator Callback Tasks: human follow-up tasks
CREATE TABLE public.operator_callback_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_from_reminder_key TEXT,
  advisory_source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_callback_tasks_booking ON public.operator_callback_tasks(booking_id);
CREATE INDEX idx_callback_tasks_status ON public.operator_callback_tasks(status);
CREATE INDEX idx_callback_tasks_priority ON public.operator_callback_tasks(priority);

ALTER TABLE public.operator_callback_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage callback_tasks" ON public.operator_callback_tasks
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
