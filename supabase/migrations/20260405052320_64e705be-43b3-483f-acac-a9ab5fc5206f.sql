
-- Marketplace access requests table
CREATE TABLE public.marketplace_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_types TEXT NOT NULL DEFAULT '',
  leads_seeking TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.marketplace_access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own request
CREATE POLICY "Users can view own marketplace request"
  ON public.marketplace_access_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own request
CREATE POLICY "Users can create own marketplace request"
  ON public.marketplace_access_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all marketplace requests"
  ON public.marketplace_access_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/deny)
CREATE POLICY "Admins can update marketplace requests"
  ON public.marketplace_access_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
