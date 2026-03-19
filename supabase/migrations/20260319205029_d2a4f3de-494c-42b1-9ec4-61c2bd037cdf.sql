
-- Add branch column to profiles
ALTER TABLE public.profiles ADD COLUMN branch text DEFAULT NULL;

-- Set all existing profiles to 'risk'
UPDATE public.profiles SET branch = 'risk' WHERE branch IS NULL;
