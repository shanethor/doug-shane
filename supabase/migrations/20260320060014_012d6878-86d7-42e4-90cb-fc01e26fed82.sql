
-- Create branding packages table
CREATE TABLE public.branding_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  brand_name text NOT NULL DEFAULT '',
  brand_colors jsonb NOT NULL DEFAULT '["#001F3F","#C9A24B"]'::jsonb,
  logo_url text,
  tagline text,
  disclaimer text,
  industry text,
  tone text DEFAULT 'professional',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own branding packages"
  ON public.branding_packages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload brand logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos');

CREATE POLICY "Anyone can read brand logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'brand-logos');

CREATE POLICY "Users can delete own brand logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos');
