
-- 1. Add unique constraint on partner_documents (partner_id + document_type) to prevent overwrites
CREATE UNIQUE INDEX IF NOT EXISTS partner_documents_partner_type_unique 
  ON public.partner_documents(partner_id, document_type);

-- 2. Add audit fields to policy_acceptances
ALTER TABLE public.policy_acceptances ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.policy_acceptances ADD COLUMN IF NOT EXISTS source_screen text;

-- 3. Make partner-uploads bucket private (ensure it's not public)
UPDATE storage.buckets SET public = false WHERE id = 'partner-uploads';
