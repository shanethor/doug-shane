
-- Add tags, client_id, and client_link_source columns to synced_emails
ALTER TABLE public.synced_emails
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS client_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_link_source text DEFAULT NULL;

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_synced_emails_tags ON public.synced_emails USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_synced_emails_client_id ON public.synced_emails (client_id, received_at DESC);
