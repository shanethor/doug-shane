
-- Add website, logo_url, and full_site_access columns to agencies
ALTER TABLE public.agencies 
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS full_site_access boolean NOT NULL DEFAULT false;

-- AURA and Associated agencies should have full_site_access by default
UPDATE public.agencies SET full_site_access = true WHERE LOWER(name) LIKE '%aura%' OR LOWER(name) LIKE '%associated%';
