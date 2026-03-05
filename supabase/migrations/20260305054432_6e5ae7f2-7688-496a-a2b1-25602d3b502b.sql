
-- Add failed_attempts column to two_factor_codes
ALTER TABLE public.two_factor_codes ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;

-- Create an RPC to atomically increment failed attempts
CREATE OR REPLACE FUNCTION public.increment_2fa_failed_attempts(row_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.two_factor_codes
  SET failed_attempts = failed_attempts + 1
  WHERE id = row_id;
$$;
