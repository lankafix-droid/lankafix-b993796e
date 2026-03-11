
-- Task 1: Settlement auto-creation on booking completion
-- Step 1: Add unique constraint on booking_id for idempotency
ALTER TABLE public.partner_settlements
  ADD CONSTRAINT partner_settlements_booking_id_unique UNIQUE (booking_id);

-- Step 2: Create trigger function
CREATE OR REPLACE FUNCTION public.create_settlement_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _gross integer;
  _commission_rate numeric;
  _commission integer;
  _net integer;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  -- Must have a partner
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Gross = final_price or estimated_price
  _gross := COALESCE(NEW.final_price_lkr, NEW.estimated_price_lkr, 0);
  IF _gross <= 0 THEN
    RETURN NEW;
  END IF;

  -- Commission rate by category tier (mirrors commissionEngine.ts)
  _commission_rate := CASE
    WHEN NEW.category_code IN ('MOBILE','IT','COPIER','PRINT_SUPPLIES','NETWORK') THEN 10
    WHEN NEW.category_code IN ('AC','CONSUMER_ELEC','ELECTRICAL','PLUMBING','APPLIANCE_INSTALL') THEN 7
    WHEN NEW.category_code IN ('CCTV','SOLAR','SMART_HOME_OFFICE','HOME_SECURITY','POWER_BACKUP') THEN 5
    ELSE 7
  END;

  _commission := ROUND(_gross * _commission_rate / 100);
  _net := _gross - _commission;

  -- Idempotent insert (unique constraint prevents duplicates)
  INSERT INTO public.partner_settlements (
    booking_id, partner_id, gross_amount_lkr,
    platform_commission_lkr, net_payout_lkr, settlement_status
  ) VALUES (
    NEW.id, NEW.partner_id, _gross,
    _commission, _net, 'pending'
  )
  ON CONFLICT (booking_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER trg_create_settlement_on_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.create_settlement_on_completion();
