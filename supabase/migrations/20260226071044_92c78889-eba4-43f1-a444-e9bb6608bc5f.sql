
-- 1. Tighten public SELECT on customer_links: only active, non-expired links
DROP POLICY IF EXISTS "Public can read links" ON public.customer_links;
CREATE POLICY "Public can read active links" ON public.customer_links
  FOR SELECT USING (expires_at > now() AND NOT is_used);

-- 2. Tighten public SELECT on intake_links: only active, non-expired links
DROP POLICY IF EXISTS "Public can read intake links by token" ON public.intake_links;
CREATE POLICY "Public can read active intake links" ON public.intake_links
  FOR SELECT USING (expires_at > now() AND NOT is_used);

-- 3. Add missing admin UPDATE/DELETE policies on feature_suggestions
CREATE POLICY "Admins update suggestions"
  ON public.feature_suggestions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete suggestions"
  ON public.feature_suggestions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Harden has_role() with null checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- 5. Harden handle_new_user() with input sanitization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_name TEXT;
BEGIN
  safe_name := COALESCE(
    TRIM(BOTH FROM (NEW.raw_user_meta_data ->> 'full_name')),
    'User'
  );
  IF LENGTH(safe_name) > 100 THEN
    safe_name := SUBSTRING(safe_name FROM 1 FOR 100);
  END IF;
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, safe_name);
  RETURN NEW;
END;
$$;
