
CREATE TABLE public.unreached_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine_lead_id UUID REFERENCES public.engine_leads(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  industry TEXT,
  est_premium NUMERIC DEFAULT 0,
  signal TEXT,
  source TEXT DEFAULT 'lead_engine',
  source_url TEXT,
  score INTEGER DEFAULT 0,
  original_owner_id UUID NOT NULL,
  original_batch_id TEXT,
  vertical TEXT,
  specializations TEXT[],
  claimed_by_user_id UUID,
  claimed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unreached_leads ENABLE ROW LEVEL SECURITY;

-- Admins can see all unreached leads
CREATE POLICY "Admins can manage unreached leads"
ON public.unreached_leads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Original owner can insert (decline leads)
CREATE POLICY "Users can insert their declined leads"
ON public.unreached_leads
FOR INSERT
TO authenticated
WITH CHECK (original_owner_id = auth.uid());
