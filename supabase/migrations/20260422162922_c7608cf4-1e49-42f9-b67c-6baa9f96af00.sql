
-- New columns on signal_items
ALTER TABLE public.signal_items
  ADD COLUMN IF NOT EXISTS title_simhash bigint,
  ADD COLUMN IF NOT EXISTS source_tier int,
  ADD COLUMN IF NOT EXISTS engagement jsonb,
  ADD COLUMN IF NOT EXISTS ingest_run_id uuid;

CREATE INDEX IF NOT EXISTS idx_signal_items_industry_published
  ON public.signal_items (industry, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_items_simhash ON public.signal_items (title_simhash);

-- last_seen_at on signal_preferences for "new since last visit" boost
ALTER TABLE public.signal_preferences
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS interests_seeded boolean NOT NULL DEFAULT false;

-- signal_ingest_runs: observability
CREATE TABLE IF NOT EXISTS public.signal_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  industry text NOT NULL,
  sources_attempted int DEFAULT 0,
  sources_failed int DEFAULT 0,
  items_fetched int DEFAULT 0,
  items_after_dedupe int DEFAULT 0,
  items_after_scoring int DEFAULT 0,
  gemini_tokens_used int DEFAULT 0,
  cost_estimate_usd numeric DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signal_ingest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ingest runs"
  ON public.signal_ingest_runs FOR SELECT TO authenticated USING (true);

-- signal_source_health
CREATE TABLE IF NOT EXISTS public.signal_source_health (
  source_url text PRIMARY KEY,
  industry text NOT NULL,
  last_successful_pull timestamptz,
  consecutive_empty_pulls int NOT NULL DEFAULT 0,
  consecutive_errors int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signal_source_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view source health"
  ON public.signal_source_health FOR SELECT TO authenticated USING (true);

-- signal_image_queue
CREATE TABLE IF NOT EXISTS public.signal_image_queue (
  signal_item_id uuid PRIMARY KEY REFERENCES public.signal_items(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_strategy text NOT NULL DEFAULT 'og',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signal_image_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view image queue"
  ON public.signal_image_queue FOR SELECT TO authenticated USING (true);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_signal_source_health_updated ON public.signal_source_health;
CREATE TRIGGER trg_signal_source_health_updated
  BEFORE UPDATE ON public.signal_source_health
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
