
-- Add partner_slug to intake_links for referral attribution
ALTER TABLE public.intake_links ADD COLUMN IF NOT EXISTS partner_slug text;

-- Partner tracker tokens for shareable links
CREATE TABLE IF NOT EXISTS public.partner_tracker_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(partner_slug),
  UNIQUE(token)
);

ALTER TABLE public.partner_tracker_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tracker tokens
CREATE POLICY "Admins manage partner tracker tokens"
  ON public.partner_tracker_tokens
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
