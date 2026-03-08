
-- Add booking protection fields to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS protection_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS protection_fee_lkr integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protection_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS contact_unlocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS protection_paid_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS protection_refundable boolean DEFAULT true;

-- Add booking protection settings to platform_settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('booking_protection_fees', '{
    "secure_booking": {"min": 500, "max": 1500, "default": 750},
    "dispatch_protection": {"min": 1000, "max": 2500, "default": 1500},
    "site_visit_reservation": {"min": 2000, "max": 5000, "default": 3000}
  }'::jsonb),
  ('protection_category_map', '{
    "MOBILE": "secure_booking",
    "IT": "secure_booking",
    "COPIER": "secure_booking",
    "PRINT_SUPPLIES": "secure_booking",
    "AC": "dispatch_protection",
    "CONSUMER_ELEC": "dispatch_protection",
    "CCTV": "site_visit_reservation",
    "SOLAR": "site_visit_reservation",
    "SMART_HOME_OFFICE": "site_visit_reservation"
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Index for protection status queries
CREATE INDEX IF NOT EXISTS idx_bookings_protection_status ON public.bookings (protection_status) WHERE protection_status IS NOT NULL;
