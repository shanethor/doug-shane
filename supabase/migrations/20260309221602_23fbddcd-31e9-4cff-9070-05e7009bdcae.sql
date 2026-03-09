-- Rename 'producer' to 'advisor' in the app_role enum
ALTER TYPE public.app_role RENAME VALUE 'producer' TO 'advisor';

-- Update all existing user_roles rows from 'producer' to 'advisor'
-- (The RENAME VALUE above handles this at the type level, but we need to ensure
-- any functions referencing the old value are updated)

-- Update the has_role function and get_user_role function to work with new enum value
-- These are SECURITY DEFINER functions that reference the enum
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    'advisor'
  )
$$;