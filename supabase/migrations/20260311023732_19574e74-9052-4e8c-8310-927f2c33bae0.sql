-- Allow users to update client_id on their own synced emails
CREATE POLICY "Users can update own synced emails"
  ON public.synced_emails FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
