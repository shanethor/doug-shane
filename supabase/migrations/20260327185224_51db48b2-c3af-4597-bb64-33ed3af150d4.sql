
-- Studio build requests table
CREATE TABLE public.studio_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'new_build' CHECK (request_type IN ('new_build', 'edit', 'call_schedule')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'building', 'delivered', 'scheduled', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_delivery TEXT,
  admin_notes TEXT,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.studio_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "Users can view own studio requests"
  ON public.studio_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users can insert their own requests
CREATE POLICY "Users can create studio requests"
  ON public.studio_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can update any request
CREATE POLICY "Admins can update studio requests"
  ON public.studio_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_requests;
