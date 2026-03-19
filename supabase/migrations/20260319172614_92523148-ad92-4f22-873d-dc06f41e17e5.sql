
-- Fix overly permissive SELECT policies on content_category_tags and content_ai_briefs
-- Restrict to only tags/briefs for published content items

DROP POLICY "Public reads tags" ON public.content_category_tags;
CREATE POLICY "Public reads tags for published content"
  ON public.content_category_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_items ci
      WHERE ci.id = content_item_id AND ci.status = 'published'
    )
  );

DROP POLICY "Public reads briefs for published content" ON public.content_ai_briefs;
CREATE POLICY "Public reads briefs for published content"
  ON public.content_ai_briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_items ci
      WHERE ci.id = content_item_id AND ci.status = 'published'
    )
  );

-- Also allow anonymous event inserts for non-logged-in users tracking impressions
CREATE POLICY "Anon can insert events"
  ON public.content_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
