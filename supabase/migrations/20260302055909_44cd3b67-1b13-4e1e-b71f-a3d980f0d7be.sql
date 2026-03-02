
CREATE OR REPLACE FUNCTION public.cleanup_old_2fa_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.two_factor_codes WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;
