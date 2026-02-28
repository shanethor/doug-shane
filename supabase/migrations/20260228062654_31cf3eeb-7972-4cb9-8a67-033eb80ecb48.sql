
-- Personal lines intake submissions table
CREATE TABLE public.personal_intake_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  agent_id UUID NOT NULL,
  delivery_emails TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  form_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE public.personal_intake_submissions ENABLE ROW LEVEL SECURITY;

-- Agents can read their own
CREATE POLICY "Agents can view own personal intake submissions"
  ON public.personal_intake_submissions
  FOR SELECT
  USING (agent_id = auth.uid());

-- Agents can create
CREATE POLICY "Agents can create personal intake submissions"
  ON public.personal_intake_submissions
  FOR INSERT
  WITH CHECK (agent_id = auth.uid());

-- Public can read by token (for the form page)
CREATE POLICY "Public can read by token"
  ON public.personal_intake_submissions
  FOR SELECT
  USING (true);

-- Public can update by token (submit the form)
CREATE POLICY "Public can submit personal intake"
  ON public.personal_intake_submissions
  FOR UPDATE
  USING (is_used = false AND expires_at > now())
  WITH CHECK (is_used = true);
