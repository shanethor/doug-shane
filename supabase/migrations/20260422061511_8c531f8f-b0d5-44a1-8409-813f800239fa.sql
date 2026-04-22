
-- Signal items (curated stories pool)
CREATE TABLE public.signal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  image_url TEXT,
  ai_image BOOLEAN NOT NULL DEFAULT false,
  industry TEXT,
  sub_vertical TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  signal_type TEXT, -- news | x_post | regulatory | trend | risk
  source_kind TEXT NOT NULL DEFAULT 'news', -- news | x | blog | reg
  importance_score INT NOT NULL DEFAULT 50, -- 0-100, AI scored
  hash TEXT UNIQUE, -- dedupe key
  raw JSONB,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signal_items_industry ON public.signal_items(industry);
CREATE INDEX idx_signal_items_published ON public.signal_items(published_at DESC);
CREATE INDEX idx_signal_items_topics ON public.signal_items USING GIN(topics);

ALTER TABLE public.signal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read signal items"
ON public.signal_items FOR SELECT TO authenticated USING (true);

-- Per-user feedback (training data)
CREATE TABLE public.signal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signal_item_id UUID NOT NULL REFERENCES public.signal_items(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL, -- not_interested | great_info | viewed | clicked | saved
  topics_snapshot TEXT[] NOT NULL DEFAULT '{}',
  source_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, signal_item_id, reaction)
);

CREATE INDEX idx_signal_feedback_user ON public.signal_feedback(user_id, created_at DESC);

ALTER TABLE public.signal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own feedback"
ON public.signal_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own feedback"
ON public.signal_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own feedback"
ON public.signal_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own feedback"
ON public.signal_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Per-user learned preferences + digest schedule
CREATE TABLE public.signal_preferences (
  user_id UUID PRIMARY KEY,
  topic_weights JSONB NOT NULL DEFAULT '{}'::jsonb,    -- { topic: weight (-5..+5) }
  source_weights JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { source_name: weight }
  blocked_topics TEXT[] NOT NULL DEFAULT '{}',
  blocked_sources TEXT[] NOT NULL DEFAULT '{}',
  industry_override TEXT,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_time TIME NOT NULL DEFAULT '08:00',
  digest_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  digest_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own signal prefs"
ON public.signal_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert their own signal prefs"
ON public.signal_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own signal prefs"
ON public.signal_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_signal_prefs_updated_at
BEFORE UPDATE ON public.signal_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
