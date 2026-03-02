
DROP POLICY IF EXISTS "Public can submit personal intake" ON public.personal_intake_submissions;

CREATE POLICY "Public can submit personal intake"
ON public.personal_intake_submissions
FOR UPDATE
TO public
USING ((is_used = false) AND (expires_at > now()))
WITH CHECK (true);
