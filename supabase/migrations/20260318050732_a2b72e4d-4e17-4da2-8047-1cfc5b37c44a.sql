
-- Table to link property-role users to their partner page and assigned advisor
CREATE TABLE public.property_partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_slug TEXT NOT NULL,
  linked_advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_user_id)
);

-- Enable RLS
ALTER TABLE public.property_partner_links ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage partner links"
ON public.property_partner_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Property users can read their own link
CREATE POLICY "Property users can read own link"
ON public.property_partner_links
FOR SELECT
TO authenticated
USING (property_user_id = auth.uid());
