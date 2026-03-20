
-- Concierge requests table
CREATE TABLE public.concierge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Concierge subscription/config table
CREATE TABLE public.concierge_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'trial_active',
  trial_start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_end_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  max_active_requests INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_concierge_requests_user ON public.concierge_requests(user_id);
CREATE INDEX idx_concierge_requests_status ON public.concierge_requests(status);

-- RLS on concierge_requests
ALTER TABLE public.concierge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own concierge requests"
  ON public.concierge_requests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

-- RLS on concierge_subscriptions
ALTER TABLE public.concierge_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own concierge subscription"
  ON public.concierge_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

-- Updated_at trigger for concierge_requests
CREATE TRIGGER update_concierge_requests_updated_at
  BEFORE UPDATE ON public.concierge_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for concierge_subscriptions
CREATE TRIGGER update_concierge_subscriptions_updated_at
  BEFORE UPDATE ON public.concierge_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
