
-- Touch cadence reminders table
CREATE TABLE public.touch_cadence_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  contact_email TEXT,
  cadence_days INTEGER NOT NULL DEFAULT 30,
  last_touched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_touch_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  touch_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.touch_cadence_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cadence contacts"
  ON public.touch_cadence_contacts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Proposal builder saved proposals
CREATE TABLE public.connect_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_company TEXT,
  opportunity TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  generated_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.connect_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own proposals"
  ON public.connect_proposals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
