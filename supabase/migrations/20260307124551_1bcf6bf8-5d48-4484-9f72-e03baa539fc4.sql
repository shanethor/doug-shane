
-- Update loss_run_requests SELECT to include manager visibility via lead_id
DROP POLICY IF EXISTS "Users can view own loss run requests" ON public.loss_run_requests;
CREATE POLICY "Users see accessible loss run requests" ON public.loss_run_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR lead_id IN (SELECT public.get_accessible_lead_ids(auth.uid()))
  );

-- Update lead_notes SELECT for manager visibility
DROP POLICY IF EXISTS "Users see notes on own leads" ON public.lead_notes;
CREATE POLICY "Users see notes on accessible leads" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR lead_id IN (SELECT public.get_accessible_lead_ids(auth.uid()))
  );
