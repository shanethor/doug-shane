
-- Feature flags table: layered on top of existing roles
CREATE TABLE public.user_features (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  granted_by uuid,
  granted_at timestamptz DEFAULT now() NOT NULL,
  notes text,
  UNIQUE(user_id, feature)
);

-- Enable RLS
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

-- Users can read their own features
CREATE POLICY "Users read own features"
  ON public.user_features FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins manage all features"
  ON public.user_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
