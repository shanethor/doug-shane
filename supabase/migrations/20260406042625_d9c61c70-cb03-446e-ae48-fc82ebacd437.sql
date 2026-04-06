ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_target numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_plan_selected text;