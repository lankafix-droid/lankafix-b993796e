
-- Add compare_group to consumable_products for explicit SmartFix vs OEM pairing
ALTER TABLE public.consumable_products ADD COLUMN IF NOT EXISTS compare_group text;

-- Add inspection operational fields to refill_inspection_logs
ALTER TABLE public.refill_inspection_logs ADD COLUMN IF NOT EXISTS leakage_flag boolean DEFAULT false;
ALTER TABLE public.refill_inspection_logs ADD COLUMN IF NOT EXISTS physical_damage_flag boolean DEFAULT false;
ALTER TABLE public.refill_inspection_logs ADD COLUMN IF NOT EXISTS prior_refill_history text;
ALTER TABLE public.refill_inspection_logs ADD COLUMN IF NOT EXISTS admin_remarks text;
ALTER TABLE public.refill_inspection_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add condition data to refill_orders  
ALTER TABLE public.refill_orders ADD COLUMN IF NOT EXISTS condition_data jsonb;

-- Create index for compare_group lookups
CREATE INDEX IF NOT EXISTS idx_consumable_products_compare_group ON public.consumable_products(compare_group) WHERE compare_group IS NOT NULL;
