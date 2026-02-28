
ALTER TABLE public.personal_intake_submissions
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS cc_producer boolean NOT NULL DEFAULT false;
