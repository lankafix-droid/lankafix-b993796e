
-- Add 'rss' to allowed source types
ALTER TABLE public.content_sources DROP CONSTRAINT content_sources_source_type_check;
ALTER TABLE public.content_sources ADD CONSTRAINT content_sources_source_type_check 
  CHECK (source_type = ANY (ARRAY['news_api', 'wiki', 'trends', 'knowledge', 'internal_editorial', 'partner_insight', 'safety_alert', 'rss']));
