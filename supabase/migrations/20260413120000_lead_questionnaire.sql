-- Add questionnaire fields to engine_leads
ALTER TABLE engine_leads
  ADD COLUMN IF NOT EXISTS questionnaire_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS questionnaire_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS questionnaire_status TEXT DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS questionnaire_response TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Index for fast token lookups (public questionnaire page)
CREATE INDEX IF NOT EXISTS idx_engine_leads_questionnaire_token
  ON engine_leads (questionnaire_token)
  WHERE questionnaire_token IS NOT NULL;

-- Allow public (unauthenticated) reads by token for the questionnaire page
CREATE POLICY "Public read engine_lead by questionnaire token"
  ON engine_leads
  FOR SELECT
  USING (questionnaire_token IS NOT NULL);

-- Allow public update of questionnaire response fields only
CREATE POLICY "Public submit questionnaire response"
  ON engine_leads
  FOR UPDATE
  USING (questionnaire_token IS NOT NULL)
  WITH CHECK (questionnaire_token IS NOT NULL);
