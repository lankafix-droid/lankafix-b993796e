
-- Customer reminders table
CREATE TABLE public.customer_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  reminder_type text NOT NULL DEFAULT 'maintenance',
  category_code text NOT NULL,
  service_type text,
  title text NOT NULL,
  message text NOT NULL,
  due_date timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  clicked_at timestamp with time zone,
  completed_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  linked_booking_id uuid,
  linked_quote_id uuid,
  next_best_action text,
  next_best_category text,
  next_best_service text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customer_reminders_customer ON public.customer_reminders(customer_id);
CREATE INDEX idx_customer_reminders_status ON public.customer_reminders(status);
CREATE INDEX idx_customer_reminders_due ON public.customer_reminders(due_date);
CREATE INDEX idx_customer_reminders_type ON public.customer_reminders(reminder_type);

-- RLS
ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own reminders"
ON public.customer_reminders FOR SELECT
TO public
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update own reminders"
ON public.customer_reminders FOR UPDATE
TO public
USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all reminders"
ON public.customer_reminders FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role inserts (from edge functions)
CREATE POLICY "Service can insert reminders"
ON public.customer_reminders FOR INSERT
TO public
WITH CHECK (true);
