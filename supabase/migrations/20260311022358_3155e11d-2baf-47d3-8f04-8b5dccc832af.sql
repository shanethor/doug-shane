
-- Create email_attachments table to store attachment metadata
CREATE TABLE public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.synced_emails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  storage_path TEXT,
  external_attachment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by email
CREATE INDEX idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX idx_email_attachments_user_id ON public.email_attachments(user_id);

-- Enable RLS
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own attachments
CREATE POLICY "Users can view own email attachments"
  ON public.email_attachments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email attachments"
  ON public.email_attachments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add has_attachments column to synced_emails for quick filtering
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;
