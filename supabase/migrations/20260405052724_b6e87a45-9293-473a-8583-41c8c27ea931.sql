
CREATE TABLE public.purchased_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  engine_lead_id UUID,
  company TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  industry TEXT,
  est_premium NUMERIC DEFAULT 0,
  signal TEXT,
  source TEXT,
  source_url TEXT,
  score INTEGER DEFAULT 0,
  batch_id TEXT,
  vertical TEXT,
  specializations TEXT[] DEFAULT '{}',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchased_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchased leads"
ON public.purchased_leads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchased leads"
ON public.purchased_leads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchased leads"
ON public.purchased_leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
