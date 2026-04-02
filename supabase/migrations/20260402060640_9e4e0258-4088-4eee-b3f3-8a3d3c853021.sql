
CREATE TABLE public.industry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  requested_industry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own requests"
ON public.industry_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.industry_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
ON public.industry_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
ON public.industry_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
