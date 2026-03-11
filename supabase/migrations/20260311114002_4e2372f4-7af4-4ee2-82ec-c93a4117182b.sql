-- Add missing columns to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS technician_note text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS parts_cost_lkr integer DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS additional_cost_lkr integer DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS discount_lkr integer DEFAULT 0;

-- Add quote_id to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);

-- Add missing booking_status enum values
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quote_rejected';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quote_revised';
