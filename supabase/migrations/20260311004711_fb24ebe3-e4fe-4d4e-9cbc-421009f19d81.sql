
DROP POLICY "Service can insert reminders" ON public.customer_reminders;

CREATE POLICY "Authenticated can insert own reminders"
ON public.customer_reminders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);
