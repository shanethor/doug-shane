CREATE POLICY "Producers delete own policies"
ON public.policies
FOR DELETE
TO authenticated
USING (producer_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));