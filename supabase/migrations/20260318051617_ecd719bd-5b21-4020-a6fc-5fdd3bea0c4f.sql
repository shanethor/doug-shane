
-- Table to store imported contacts from all sources
CREATE TABLE public.network_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL, -- 'google', 'linkedin_csv', 'phone', 'manual'
  external_id text, -- provider-specific ID
  full_name text,
  email text,
  phone text,
  company text,
  title text,
  linkedin_url text,
  location text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, external_id)
);

ALTER TABLE public.network_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contacts"
  ON public.network_contacts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table to track which network sources a user has connected
CREATE TABLE public.network_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL, -- 'google_contacts', 'linkedin', 'phone', 'social'
  status text NOT NULL DEFAULT 'connected', -- 'connected', 'syncing', 'error'
  last_sync_at timestamptz,
  contact_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source)
);

ALTER TABLE public.network_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own network connections"
  ON public.network_connections FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
