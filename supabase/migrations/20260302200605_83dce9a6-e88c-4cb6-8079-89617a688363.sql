-- Allow users to update their own synced emails (mark read)
CREATE POLICY "Users update own synced emails"
ON public.synced_emails
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for synced_emails so unread badge updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.synced_emails;