
-- Add submission_id to leads so we can link pipeline leads to their workspace data
ALTER TABLE public.leads ADD COLUMN submission_id uuid REFERENCES public.business_submissions(id) ON DELETE SET NULL;

-- Add form_data_snapshot to policies for freezing workspace data at time of sale
ALTER TABLE public.policies ADD COLUMN form_data_snapshot jsonb;

-- Index for fast lookup
CREATE INDEX idx_leads_submission_id ON public.leads(submission_id) WHERE submission_id IS NOT NULL;
