
ALTER TABLE public.customer_links
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

ALTER TABLE public.personal_intake_submissions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');
