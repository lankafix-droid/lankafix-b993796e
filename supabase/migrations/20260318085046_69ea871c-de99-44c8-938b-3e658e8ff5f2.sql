
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'hero_promotion',
  title text NOT NULL,
  subtitle text,
  body text,
  cta_label text,
  cta_deep_link text,
  image_url text,
  mobile_image_url text,
  language text NOT NULL DEFAULT 'en',
  category_ids text[] DEFAULT '{}',
  zones text[] DEFAULT '{}',
  audience_type text NOT NULL DEFAULT 'all',
  priority integer NOT NULL DEFAULT 50,
  active_from timestamptz,
  active_to timestamptz,
  active_days text[] DEFAULT '{mon,tue,wed,thu,fri,sat,sun}',
  active_hours int4range,
  required_supply_threshold integer DEFAULT 1,
  booking_state_rules jsonb DEFAULT '{}',
  user_segment_rules jsonb DEFAULT '{}',
  suppression_rules jsonb DEFAULT '{}',
  experiment_id text,
  variant text DEFAULT 'A',
  trust_badges text[] DEFAULT '{}',
  urgency_tag text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active campaigns"
  ON public.campaigns FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert campaign events"
  ON public.campaign_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage campaign events"
  ON public.campaign_events FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_campaigns_status_priority ON public.campaigns(status, priority DESC);
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events(campaign_id, event_type);
