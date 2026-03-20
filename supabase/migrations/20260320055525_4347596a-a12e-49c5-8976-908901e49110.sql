
-- Add contact preference to concierge_requests
ALTER TABLE public.concierge_requests
  ADD COLUMN IF NOT EXISTS contact_preference text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Create concierge_files table for file sharing between admin and users
CREATE TABLE public.concierge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.concierge_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_by_role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concierge_files ENABLE ROW LEVEL SECURITY;

-- Users can see files on their own requests; admins can see all
CREATE POLICY "Users see own request files"
  ON public.concierge_files FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.concierge_requests cr
      WHERE cr.id = concierge_files.request_id AND cr.user_id = auth.uid()
    )
  );

-- Users can insert files on their own requests
CREATE POLICY "Users insert own request files"
  ON public.concierge_files FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.concierge_requests cr
        WHERE cr.id = concierge_files.request_id AND cr.user_id = auth.uid()
      )
    )
  );

-- Admins can insert files on any request
CREATE POLICY "Admins insert any request files"
  ON public.concierge_files FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

-- Create storage bucket for concierge files
INSERT INTO storage.buckets (id, name, public) VALUES ('concierge-files', 'concierge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users upload concierge files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'concierge-files');

CREATE POLICY "Users read own concierge files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'concierge-files');
