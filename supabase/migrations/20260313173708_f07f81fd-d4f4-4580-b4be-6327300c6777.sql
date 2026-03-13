
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS policy_term text NOT NULL DEFAULT '1_year',
ADD COLUMN IF NOT EXISTS expiration_date date;

-- Backfill expiration_date for existing policies based on 1-year term
UPDATE public.policies
SET expiration_date = (effective_date::date + INTERVAL '1 year')::date
WHERE expiration_date IS NULL;
