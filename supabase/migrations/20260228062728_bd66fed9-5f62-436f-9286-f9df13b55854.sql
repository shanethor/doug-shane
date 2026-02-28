
-- Tighten the public SELECT to only non-expired, non-used tokens
DROP POLICY "Public can read by token" ON public.personal_intake_submissions;
CREATE POLICY "Public can read active tokens"
  ON public.personal_intake_submissions
  FOR SELECT
  USING (
    agent_id = auth.uid()
    OR (is_used = false AND expires_at > now())
  );
