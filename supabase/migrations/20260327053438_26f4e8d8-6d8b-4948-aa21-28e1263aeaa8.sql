
CREATE TABLE public.icloud_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apple_id_email TEXT NOT NULL,
  app_password_encrypted TEXT NOT NULL,
  sync_token TEXT,
  auto_sync BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.icloud_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own icloud connection"
  ON public.icloud_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
