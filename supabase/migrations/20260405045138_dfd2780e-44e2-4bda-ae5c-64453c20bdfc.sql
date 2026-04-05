CREATE POLICY "Users can delete own engine leads"
ON public.engine_leads
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));