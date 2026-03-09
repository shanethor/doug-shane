
-- Lead Engine: detected leads from intelligence sources
CREATE TABLE public.engine_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  company text NOT NULL,
  contact_name text,
  email text,
  phone text,
  state text,
  industry text,
  est_premium numeric DEFAULT 0,
  signal text,
  source text NOT NULL DEFAULT 'manual',
  score integer NOT NULL DEFAULT 50,
  tier integer NOT NULL DEFAULT 3 CHECK (tier IN (1, 2, 3)),
  status text NOT NULL DEFAULT 'new',
  assigned_to text,
  action text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engine leads"
  ON public.engine_leads FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can insert own engine leads"
  ON public.engine_leads FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own engine leads"
  ON public.engine_leads FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Lead Engine: activity log
CREATE TABLE public.engine_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  engine_lead_id uuid REFERENCES public.engine_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  source text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engine activity"
  ON public.engine_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can insert own engine activity"
  ON public.engine_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lead source configurations
CREATE TABLE public.lead_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  settings jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source)
);

ALTER TABLE public.lead_source_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own source configs"
  ON public.lead_source_configs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
