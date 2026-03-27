
ALTER TABLE public.email_discovered_contacts 
  ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS contact_score integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS filtered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrichment_source text DEFAULT null,
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS apollo_data jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS profile_photo_url text DEFAULT null,
  ADD COLUMN IF NOT EXISTS location text DEFAULT null,
  ADD COLUMN IF NOT EXISTS twitter_url text DEFAULT null,
  ADD COLUMN IF NOT EXISTS employment_history jsonb DEFAULT null;

CREATE TABLE IF NOT EXISTS public.contact_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  contact_a_id uuid REFERENCES public.email_discovered_contacts(id) ON DELETE CASCADE,
  contact_b_id uuid REFERENCES public.email_discovered_contacts(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'shared_thread',
  thread_id text,
  confidence numeric DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_user_id, contact_a_id, contact_b_id, source)
);

ALTER TABLE public.contact_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact relationships"
  ON public.contact_relationships FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert own contact relationships"
  ON public.contact_relationships FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
