
-- Create agencies table
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read agencies (for onboarding lookup)
CREATE POLICY "Authenticated users can read agencies"
  ON public.agencies FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage agencies
CREATE POLICY "Admins manage agencies"
  ON public.agencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add agency_id and approval_status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Seed existing agencies
INSERT INTO public.agencies (id, name, code) VALUES
  (gen_random_uuid(), 'Associated Insurance', 'ASSOCIATED'),
  (gen_random_uuid(), 'Abbate Insurance', 'ABBATE'),
  (gen_random_uuid(), 'AURA Risk Group', 'AURA');
