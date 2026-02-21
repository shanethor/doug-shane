
-- Loss Run Request status enum
CREATE TYPE public.loss_run_status AS ENUM (
  'not_requested', 'requested', 'sent', 'partial_received', 'complete_received', 'not_needed'
);

-- Loss Run Requests table
CREATE TABLE public.loss_run_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'Non-ALR',
  status public.loss_run_status NOT NULL DEFAULT 'not_requested',
  requested_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  delivery_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loss Run Policy Items (prior policies per request)
CREATE TABLE public.loss_run_policy_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loss_run_request_id UUID NOT NULL REFERENCES public.loss_run_requests(id) ON DELETE CASCADE,
  insured_name TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE NOT NULL,
  line_of_business TEXT,
  request_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loss Run Attachments (auth letters, received loss runs)
CREATE TABLE public.loss_run_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loss_run_request_id UUID NOT NULL REFERENCES public.loss_run_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'received', -- 'authorization' or 'received'
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loss_run_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_run_policy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_run_attachments ENABLE ROW LEVEL SECURITY;

-- RLS for loss_run_requests
CREATE POLICY "Users can view own loss run requests"
ON public.loss_run_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own loss run requests"
ON public.loss_run_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can update own loss run requests"
ON public.loss_run_requests FOR UPDATE TO authenticated
USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS for loss_run_policy_items (via parent)
CREATE POLICY "Users can view loss run policy items"
ON public.loss_run_policy_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loss_run_requests r
  WHERE r.id = loss_run_request_id
  AND (r.requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users can insert loss run policy items"
ON public.loss_run_policy_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.loss_run_requests r
  WHERE r.id = loss_run_request_id AND r.requested_by = auth.uid()
));

CREATE POLICY "Users can update loss run policy items"
ON public.loss_run_policy_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loss_run_requests r
  WHERE r.id = loss_run_request_id AND r.requested_by = auth.uid()
));

CREATE POLICY "Users can delete loss run policy items"
ON public.loss_run_policy_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loss_run_requests r
  WHERE r.id = loss_run_request_id AND r.requested_by = auth.uid()
));

-- RLS for loss_run_attachments (via parent)
CREATE POLICY "Users can view loss run attachments"
ON public.loss_run_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.loss_run_requests r
  WHERE r.id = loss_run_request_id
  AND (r.requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users can insert loss run attachments"
ON public.loss_run_attachments FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Updated_at trigger for loss_run_requests
CREATE TRIGGER update_loss_run_requests_updated_at
BEFORE UPDATE ON public.loss_run_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
