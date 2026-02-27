
-- Add lead_id to business_submissions to support multiple policies per client
ALTER TABLE public.business_submissions 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_business_submissions_lead_id ON public.business_submissions(lead_id);

-- RLS policy: users can see their own submissions (already exists, lead_id doesn't affect it)
