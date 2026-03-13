
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles, admins/managers see all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );
