
-- Create client_documents table for attaching documents to submissions/leads
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.business_submissions(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_parent CHECK (submission_id IS NOT NULL OR lead_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own documents
CREATE POLICY "Users can view their own client documents"
  ON public.client_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client documents"
  ON public.client_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all client documents"
  ON public.client_documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_client_documents_submission ON public.client_documents(submission_id);
CREATE INDEX idx_client_documents_lead ON public.client_documents(lead_id);
