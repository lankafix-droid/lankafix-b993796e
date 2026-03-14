
-- Add skill_level to partners (1=Basic, 2=Advanced, 3=Specialist, 4=Expert)
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS skill_level integer NOT NULL DEFAULT 1;

-- Add quote_approval_rate if not present (already exists per schema, so this is safe)
-- Add customer_priority support columns
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS communication_rating numeric DEFAULT 0;
