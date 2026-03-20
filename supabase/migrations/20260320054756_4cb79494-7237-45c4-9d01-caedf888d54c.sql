
-- Marketing flyers table for AURA Spotlight
CREATE TABLE public.marketing_flyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'event',
  raw_prompt TEXT NOT NULL DEFAULT '',
  structured_prompt TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  date_time TEXT,
  evergreen BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta TEXT NOT NULL DEFAULT '',
  brand_name TEXT NOT NULL DEFAULT '',
  brand_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  disclaimer TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  result_image_url TEXT,
  result_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.marketing_flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flyers"
  ON public.marketing_flyers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flyers"
  ON public.marketing_flyers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flyers"
  ON public.marketing_flyers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flyers"
  ON public.marketing_flyers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "Admins can view all flyers"
  ON public.marketing_flyers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_marketing_flyers_updated_at
  BEFORE UPDATE ON public.marketing_flyers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
