-- Allow customers to approve/reject quotes for their own bookings
CREATE POLICY "Customers can update quotes for own bookings"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = quotes.booking_id
    AND b.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = quotes.booking_id
    AND b.customer_id = auth.uid()
  )
);