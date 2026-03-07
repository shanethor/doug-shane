
-- Update leads SELECT policy to use get_accessible_lead_ids
DROP POLICY IF EXISTS "Producers see own leads" ON public.leads;
CREATE POLICY "Users see accessible leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.get_accessible_lead_ids(auth.uid()))
  );

-- Update leads UPDATE policy 
DROP POLICY IF EXISTS "Producers update own leads" ON public.leads;
CREATE POLICY "Users update accessible leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Update policies SELECT to include manager visibility via leads
DROP POLICY IF EXISTS "Producers see own policies" ON public.policies;
CREATE POLICY "Users see accessible policies" ON public.policies
  FOR SELECT TO authenticated
  USING (
    producer_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR lead_id IN (SELECT public.get_accessible_lead_ids(auth.uid()))
  );
