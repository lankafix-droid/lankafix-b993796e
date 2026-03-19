
-- Add ops/conversion columns to demand_requests
ALTER TABLE public.demand_requests
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS conversion_value integer,
  ADD COLUMN IF NOT EXISTS honeypot text;

-- Auto-set follow_up_due_at based on preferred_time using a trigger
CREATE OR REPLACE FUNCTION public.set_demand_follow_up_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.follow_up_due_at IS NULL THEN
    NEW.follow_up_due_at := CASE NEW.preferred_time
      WHEN 'asap' THEN NEW.created_at + interval '15 minutes'
      WHEN 'today' THEN NEW.created_at + interval '1 hour'
      WHEN 'tomorrow' THEN NEW.created_at + interval '4 hours'
      ELSE NEW.created_at + interval '2 hours'
    END;
  END IF;

  -- Smart priority scoring
  NEW.priority_score := COALESCE(NEW.priority_score, 0);
  IF NEW.preferred_time = 'asap' THEN
    NEW.priority_score := GREATEST(NEW.priority_score, 80);
    NEW.priority := 'high';
  END IF;
  IF NEW.category_code IN ('MOBILE', 'IT', 'ELECTRICAL') THEN
    NEW.priority_score := NEW.priority_score + 10;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demand_follow_up ON public.demand_requests;
CREATE TRIGGER trg_demand_follow_up
  BEFORE INSERT ON public.demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_demand_follow_up_due();

-- Contact logs table for tracking call/whatsapp attempts
CREATE TABLE IF NOT EXISTS public.demand_contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_request_id uuid NOT NULL REFERENCES public.demand_requests(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'call',
  contacted_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.demand_contact_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
