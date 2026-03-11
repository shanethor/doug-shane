
ALTER TABLE public.intake_links
  ADD COLUMN IF NOT EXISTS prefill_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS line_type text DEFAULT NULL;
