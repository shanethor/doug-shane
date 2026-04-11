-- Allow authenticated users to upload files to the clark/uploads/ path in agency-assets.
-- This is required for the large-file (>4 MB) extraction path in ClarkChat.
-- Files are keyed by user_id so users can only access their own uploads.

INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

-- INSERT: authenticated users can upload to clark/uploads/{their own user_id}/...
CREATE POLICY "clark_uploads_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-assets'
  AND name LIKE 'clark/uploads/' || auth.uid()::text || '/%'
);

-- SELECT: authenticated users can read their own clark uploads
CREATE POLICY "clark_uploads_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND name LIKE 'clark/uploads/' || auth.uid()::text || '/%'
);

-- DELETE: authenticated users can delete their own clark uploads
CREATE POLICY "clark_uploads_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND name LIKE 'clark/uploads/' || auth.uid()::text || '/%'
);
