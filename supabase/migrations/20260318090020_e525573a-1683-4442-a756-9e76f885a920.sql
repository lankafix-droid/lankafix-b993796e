
-- Add campaign_attributions table for conversion tracking
CREATE TABLE IF NOT EXISTS public.campaign_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  first_touch_campaign_id text,
  last_touch_campaign_id text,
  assisted_campaign_ids text[] DEFAULT '{}',
  attributed_revenue_lkr integer DEFAULT 0,
  attribution_type text NOT NULL DEFAULT 'first_touch',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read attributions"
  ON public.campaign_attributions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add campaign_dismissals table for suppression/fatigue tracking
CREATE TABLE IF NOT EXISTS public.campaign_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  dismissal_type text NOT NULL DEFAULT 'dismiss',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals"
  ON public.campaign_dismissals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_dismissals_user
  ON public.campaign_dismissals(user_id, campaign_id);
