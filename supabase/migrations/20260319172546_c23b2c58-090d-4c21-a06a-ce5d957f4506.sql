
-- ============================================
-- CONTENT INTELLIGENCE DATA FOUNDATION
-- ============================================

-- 1. content_sources
CREATE TABLE public.content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'news_api'
    CHECK (source_type IN ('news_api','wiki','trends','knowledge','internal_editorial','partner_insight','safety_alert')),
  base_url text,
  source_vendor text,
  active boolean NOT NULL DEFAULT true,
  trust_score numeric(3,2) NOT NULL DEFAULT 0.70,
  freshness_priority integer NOT NULL DEFAULT 50,
  refresh_interval_minutes integer NOT NULL DEFAULT 60,
  category_allowlist text[] DEFAULT '{}',
  category_blocklist text[] DEFAULT '{}',
  sri_lanka_bias numeric(3,2) DEFAULT 0.50,
  language_support text[] DEFAULT '{en}',
  legal_notes text,
  last_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active sources"
  ON public.content_sources FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage sources"
  ON public.content_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_sources_active ON public.content_sources (active);

-- 2. content_items
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.content_sources(id) ON DELETE SET NULL,
  source_item_id text,
  content_type text NOT NULL DEFAULT 'hot_topic'
    CHECK (content_type IN (
      'breaking_news','hot_topic','innovation','trend_signal','safety_alert','scam_alert',
      'knowledge_fact','history','on_this_day','numbers_insight','seasonal_tip',
      'how_to','most_read','market_shift'
    )),
  title text NOT NULL,
  raw_excerpt text,
  raw_body text,
  canonical_url text,
  image_url text,
  source_name text,
  source_country text DEFAULT 'LK',
  language text DEFAULT 'en',
  published_at timestamptz,
  fetched_at timestamptz DEFAULT now(),
  raw_payload jsonb,
  dedupe_key text,
  fetch_hash text,
  source_trust_score numeric(3,2),
  freshness_score numeric(5,2) DEFAULT 50,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','processed','published','needs_review','rejected','archived')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published content"
  ON public.content_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins manage content"
  ON public.content_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_items_status ON public.content_items (status);
CREATE INDEX idx_content_items_published_at ON public.content_items (published_at DESC);
CREATE INDEX idx_content_items_content_type ON public.content_items (content_type);
CREATE INDEX idx_content_items_freshness ON public.content_items (freshness_score DESC);
CREATE INDEX idx_content_items_source_trust ON public.content_items (source_trust_score DESC);
CREATE UNIQUE INDEX idx_content_items_dedupe ON public.content_items (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. content_category_tags
CREATE TABLE public.content_category_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  category_code text NOT NULL,
  confidence_score numeric(3,2) DEFAULT 0.80,
  reason text
);

ALTER TABLE public.content_category_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads tags"
  ON public.content_category_tags FOR SELECT USING (true);

CREATE POLICY "Admins manage tags"
  ON public.content_category_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_category_tags_item ON public.content_category_tags (content_item_id);
CREATE INDEX idx_content_category_tags_category ON public.content_category_tags (category_code);

-- 4. content_ai_briefs
CREATE TABLE public.content_ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  ai_headline text,
  ai_summary_short text,
  ai_summary_medium text,
  ai_summary_long text,
  ai_why_it_matters text,
  ai_lankafix_angle text,
  ai_banner_text text,
  ai_cta_label text,
  ai_keywords text[],
  ai_risk_flags text[],
  ai_quality_score numeric(3,2),
  ai_model text,
  prompt_version text,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE public.content_ai_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads briefs for published content"
  ON public.content_ai_briefs FOR SELECT USING (true);

CREATE POLICY "Admins manage briefs"
  ON public.content_ai_briefs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_ai_briefs_item ON public.content_ai_briefs (content_item_id);
CREATE INDEX idx_content_ai_briefs_quality ON public.content_ai_briefs (ai_quality_score DESC);

-- 5. content_trend_clusters
CREATE TABLE public.content_trend_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key text NOT NULL UNIQUE,
  cluster_label text NOT NULL,
  category_code text,
  momentum_score numeric(5,2) DEFAULT 0,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  content_count integer DEFAULT 1,
  sri_lanka_relevance_score numeric(3,2) DEFAULT 0.50,
  commercial_relevance_score numeric(3,2) DEFAULT 0.50,
  active boolean DEFAULT true
);

ALTER TABLE public.content_trend_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active clusters"
  ON public.content_trend_clusters FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage clusters"
  ON public.content_trend_clusters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_trend_momentum ON public.content_trend_clusters (momentum_score DESC);
CREATE INDEX idx_content_trend_category ON public.content_trend_clusters (category_code);
CREATE INDEX idx_content_trend_active ON public.content_trend_clusters (active);

-- 6. content_publish_rules
CREATE TABLE public.content_publish_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_code text NOT NULL,
  category_code text,
  content_type_allowlist text[],
  max_items integer DEFAULT 5,
  freshness_limit_hours integer DEFAULT 48,
  minimum_source_trust numeric(3,2) DEFAULT 0.60,
  minimum_ai_quality numeric(3,2) DEFAULT 0.60,
  minimum_relevance numeric(3,2) DEFAULT 0.50,
  sri_lanka_priority numeric(3,2) DEFAULT 0.60,
  commercial_priority numeric(3,2) DEFAULT 0.50,
  enabled boolean DEFAULT true
);

ALTER TABLE public.content_publish_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads enabled rules"
  ON public.content_publish_rules FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins manage rules"
  ON public.content_publish_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. content_surface_state
CREATE TABLE public.content_surface_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_code text NOT NULL
    CHECK (surface_code IN (
      'homepage_hero','homepage_hot_now','homepage_did_you_know','homepage_innovations',
      'homepage_safety','homepage_numbers','homepage_popular','category_featured',
      'category_feed','ai_banner_forum'
    )),
  category_code text,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  rank_score numeric(5,2) DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  active boolean DEFAULT true
);

ALTER TABLE public.content_surface_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active surfaces"
  ON public.content_surface_state FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage surfaces"
  ON public.content_surface_state FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_surface_active ON public.content_surface_state (surface_code, active, rank_score DESC);
CREATE INDEX idx_content_surface_category ON public.content_surface_state (category_code);

-- 8. content_events
CREATE TABLE public.content_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL
    CHECK (event_type IN (
      'impression','click','open','dismiss','save','share',
      'category_clickthrough','booking_clickthrough'
    )),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON public.content_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all events"
  ON public.content_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_events_item ON public.content_events (content_item_id);
CREATE INDEX idx_content_events_type ON public.content_events (event_type);
CREATE INDEX idx_content_events_created ON public.content_events (created_at DESC);

-- 9. content_editorial_actions
CREATE TABLE public.content_editorial_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  action_type text NOT NULL
    CHECK (action_type IN ('feature','pin','suppress','reject','approve','archive','force_publish')),
  actor_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_editorial_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage editorial"
  ON public.content_editorial_actions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_editorial_item ON public.content_editorial_actions (content_item_id);

-- Enable realtime for surface state (live content updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_surface_state;
