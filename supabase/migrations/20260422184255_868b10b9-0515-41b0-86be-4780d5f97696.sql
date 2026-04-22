ALTER TABLE public.signal_preferences
ADD COLUMN IF NOT EXISTS custom_topics text[] NOT NULL DEFAULT '{}'::text[];