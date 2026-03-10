CREATE POLICY "Users delete own policy documents"
ON public.policy_documents
FOR DELETE
TO authenticated
USING (uploaded_by_user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.policies p
  WHERE p.id = policy_id
  AND (p.producer_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));