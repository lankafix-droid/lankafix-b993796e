
-- ============================================
-- SPS AI PRODUCTION HARDENING
-- ============================================

-- 1. LOCK DOWN AI TABLE INSERT POLICIES (service_role only via edge function)
DROP POLICY IF EXISTS "Anon can insert plan insights" ON public.sps_ai_plan_insights;
DROP POLICY IF EXISTS "System can insert ticket triage" ON public.sps_ai_ticket_triage;
DROP POLICY IF EXISTS "System can insert meter reviews" ON public.sps_ai_meter_reviews;
DROP POLICY IF EXISTS "Anyone can insert advisor sessions" ON public.sps_ai_advisor_sessions;

-- Service role bypasses RLS, so no INSERT policy needed for edge functions.
-- Authenticated users should NOT be able to insert AI records directly.

-- Admin read access for all AI tables
CREATE POLICY "Admins can view all plan insights" ON public.sps_ai_plan_insights FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all ticket triage" ON public.sps_ai_ticket_triage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all meter reviews" ON public.sps_ai_meter_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all advisor sessions" ON public.sps_ai_advisor_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. ADD OBSERVABILITY COLUMNS TO AI TABLES
ALTER TABLE public.sps_ai_plan_insights ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE public.sps_ai_plan_insights ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'google/gemini-3-flash-preview';
ALTER TABLE public.sps_ai_plan_insights ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.sps_ai_plan_insights ADD COLUMN IF NOT EXISTS was_fallback boolean DEFAULT false;

ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'google/gemini-3-flash-preview';
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.sps_ai_ticket_triage ADD COLUMN IF NOT EXISTS was_fallback boolean DEFAULT false;

ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'google/gemini-3-flash-preview';
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS was_fallback boolean DEFAULT false;
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS ocr_extracted_value integer;
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS ocr_confidence numeric;
ALTER TABLE public.sps_ai_meter_reviews ADD COLUMN IF NOT EXISTS ocr_image_url text;

ALTER TABLE public.sps_ai_advisor_sessions ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE public.sps_ai_advisor_sessions ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'google/gemini-3-flash-preview';
ALTER TABLE public.sps_ai_advisor_sessions ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.sps_ai_advisor_sessions ADD COLUMN IF NOT EXISTS was_fallback boolean DEFAULT false;

-- 3. SPS AI OBSERVABILITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.sps_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  session_id text,
  latency_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  was_fallback boolean DEFAULT false,
  ai_model text,
  input_hash text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view AI logs" ON public.sps_ai_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. SPS FAQ/POLICY KNOWLEDGE TABLE (source of truth for advisor)
CREATE TABLE IF NOT EXISTS public.sps_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_key text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sps_knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active knowledge" ON public.sps_knowledge_articles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage knowledge" ON public.sps_knowledge_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. SEED KNOWLEDGE ARTICLES
INSERT INTO public.sps_knowledge_articles (article_key, category, title, content) VALUES
('deposit_explained', 'billing', 'Why is a deposit collected?', 'A refundable deposit secures the assigned SmartFix Certified device. It protects against damage or misuse. The deposit is refundable subject to final inspection and agreement terms. Deductions may apply for damage, missing parts, or outstanding balances.'),
('overage_explained', 'billing', 'What happens if I exceed my page limit?', 'Pages printed beyond your plan''s included monthly allowance are charged at the per-page overage rate specified in your plan. Overage is calculated at each billing cycle based on verified meter readings.'),
('pause_policy', 'contract', 'Can I pause my subscription?', 'Pause is available on select plans (Student Study, Family Print, Tuition Print). Contact LankaFix to request a pause. Pause terms and minimum active months before pause eligibility are defined in your agreement.'),
('upgrade_policy', 'contract', 'Can I upgrade my plan?', 'Yes. Plan upgrades are reviewed and approved by LankaFix. Upgrades may involve a different printer class, adjusted monthly fee, and updated included pages. Contact LankaFix to request an upgrade review.'),
('meter_submission', 'operations', 'How do I submit a meter reading?', 'Submit your meter reading monthly through the SPS Dashboard. Enter the current counter value and upload a photo of the counter display. Readings are verified by LankaFix. If a reading appears anomalous, you may be asked to resubmit or a technician may verify in person.'),
('support_levels', 'support', 'What support is included?', 'Support varies by plan: Basic (phone support), Standard (priority consumable delivery), Priority (next-business-day technician), Premium (4-hour response + backup device). Check your plan details for your specific support level.'),
('custom_quote', 'plans', 'What is a custom quote plan?', 'Custom quote plans are for business, institutional, or high-volume needs that exceed standard plan parameters. LankaFix reviews your requirements and provides a tailored proposal including device class, pricing, and support terms.'),
('refund_policy', 'billing', 'Is my deposit refundable?', 'Deposits are refundable subject to final device inspection when the contract ends normally. Deductions may apply for device damage, missing accessories, or outstanding billing amounts. Full terms are in your agreement.'),
('smartfix_certified', 'trust', 'What does SmartFix Certified mean?', 'SmartFix Certified means the device has been professionally inspected, tested, refurbished where needed, and verified to meet LankaFix quality and reliability standards before assignment to an SPS subscriber.'),
('buyout_option', 'contract', 'Can I buy the printer later?', 'Buyout options may be available at end of contract term, subject to LankaFix review. The buyout price considers the device condition, age, and remaining value. Contact LankaFix to discuss buyout eligibility.')
ON CONFLICT (article_key) DO NOTHING;
