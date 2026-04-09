-- Allow public (anon) users to SELECT a submission by questionnaire_token
CREATE POLICY "Public can view submission by questionnaire token"
ON public.clark_submissions
FOR SELECT
TO anon
USING (
  questionnaire_token IS NOT NULL 
  AND questionnaire_completed = false
);

-- Allow public (anon) users to UPDATE a submission by questionnaire_token (to fill in answers)
CREATE POLICY "Public can complete questionnaire by token"
ON public.clark_submissions
FOR UPDATE
TO anon
USING (
  questionnaire_token IS NOT NULL 
  AND questionnaire_completed = false
)
WITH CHECK (
  questionnaire_token IS NOT NULL
);