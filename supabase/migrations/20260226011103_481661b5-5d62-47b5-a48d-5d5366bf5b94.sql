
-- Intake links table for customer intake forms
CREATE TABLE public.intake_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  agent_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  submission_id UUID REFERENCES public.business_submissions(id),
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE public.intake_links ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own links
CREATE POLICY "Agents can manage own intake links"
  ON public.intake_links FOR ALL
  USING (agent_id = auth.uid());

-- Public read for token lookup (customers accessing the form)
CREATE POLICY "Public can read intake links by token"
  ON public.intake_links FOR SELECT
  USING (true);

-- Intake submissions table (public, no auth required)
CREATE TABLE public.intake_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_link_id UUID NOT NULL REFERENCES public.intake_links(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  requested_coverage TEXT,
  requested_premium TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

-- Public insert (customers submit without auth)
CREATE POLICY "Public can insert intake submissions"
  ON public.intake_submissions FOR INSERT
  WITH CHECK (true);

-- Agents can read submissions for their links
CREATE POLICY "Agents can read own intake submissions"
  ON public.intake_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_links il 
      WHERE il.id = intake_link_id AND il.agent_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "Admins can read all intake links"
  ON public.intake_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can read all intake submissions"
  ON public.intake_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
