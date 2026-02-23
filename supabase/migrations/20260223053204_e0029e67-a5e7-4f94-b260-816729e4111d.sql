-- Add loss_reason column to leads for tracking why deals were lost
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Add presenting_details column to leads for tracking quote info being presented
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS presenting_details JSONB;