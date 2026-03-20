
-- SPS V3: Enforcement (idempotent)

-- Functions (CREATE OR REPLACE is inherently idempotent)
CREATE OR REPLACE FUNCTION public.check_single_active_asset_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.contract_status IN ('active', 'paused') AND NEW.asset_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.sps_contracts
      WHERE asset_id = NEW.asset_id AND id != NEW.id AND contract_status IN ('active', 'paused')
    ) THEN
      RAISE EXCEPTION 'Asset % is already assigned to an active contract', NEW.asset_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_meter_reading_sequence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE last_verified_value integer;
BEGIN
  SELECT MAX(reading_value) INTO last_verified_value
  FROM public.sps_meter_readings
  WHERE contract_id = NEW.contract_id AND verification_status = 'verified';
  IF last_verified_value IS NOT NULL AND NEW.reading_value < last_verified_value THEN
    NEW.anomaly_flag := true;
    NEW.notes := COALESCE(NEW.notes, '') || ' [AUTO-FLAGGED: reading ' || NEW.reading_value || ' < last verified ' || last_verified_value || ']';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_contract_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.contract_status = 'active' AND (OLD.contract_status IS NULL OR OLD.contract_status != 'active') THEN
    IF NEW.plan_id IS NULL THEN RAISE EXCEPTION 'Contract requires a plan before activation'; END IF;
    IF NEW.asset_id IS NULL THEN RAISE EXCEPTION 'Contract requires an assigned asset before activation'; END IF;
    IF NEW.agreement_accepted IS NOT TRUE THEN RAISE EXCEPTION 'Agreement must be accepted before activation'; END IF;
    IF NEW.deposit_amount IS NULL OR NEW.deposit_amount <= 0 THEN RAISE EXCEPTION 'Deposit details required before activation'; END IF;
    IF NEW.start_date IS NULL THEN NEW.start_date := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers (drop then create to be idempotent)
DROP TRIGGER IF EXISTS enforce_single_asset_assignment ON public.sps_contracts;
CREATE TRIGGER enforce_single_asset_assignment
  BEFORE INSERT OR UPDATE ON public.sps_contracts
  FOR EACH ROW EXECUTE FUNCTION public.check_single_active_asset_assignment();

DROP TRIGGER IF EXISTS validate_meter_sequence ON public.sps_meter_readings;
CREATE TRIGGER validate_meter_sequence
  BEFORE INSERT ON public.sps_meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.validate_meter_reading_sequence();

DROP TRIGGER IF EXISTS enforce_contract_activation ON public.sps_contracts;
CREATE TRIGGER enforce_contract_activation
  BEFORE INSERT OR UPDATE ON public.sps_contracts
  FOR EACH ROW EXECUTE FUNCTION public.validate_contract_activation();

-- Columns
ALTER TABLE public.sps_plans ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}';
ALTER TABLE public.sps_plans ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 100;
