-- Add ai_preferences column to profiles for server-backed consent sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_preferences jsonb DEFAULT '{}'::jsonb;